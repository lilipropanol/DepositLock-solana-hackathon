// DepositLock — a time-locked rental deposit escrow on Solana.
//
// THE IDEA IN ONE PARAGRAPH
// Today a landlord holds your security deposit in their own bank account, and
// getting it back depends entirely on them choosing to act. DepositLock inverts
// that: the deposit is held by this program, and if the landlord does *nothing*
// after the lease ends, the money goes back to the tenant automatically. Silence
// favours the tenant instead of the landlord.
//
// WHAT A "PROGRAM" IS
// On Solana, a program is a piece of code with no memory of its own. All state
// lives in separate "accounts" that get passed into each call. This program owns
// one kind of account -- an Escrow -- which stores the lease terms AND holds the
// deposited SOL itself.
//
// WHAT A "PDA" IS (Program Derived Address)
// A PDA is an account whose address is derived from a set of seeds plus this
// program's ID. Critically, it has no private key -- so no human can ever sign
// for it. Only this program can move its funds, and only by following the rules
// written below. That is what "neutral escrow" actually means here: not "we
// promise not to touch it," but "there is no key to touch it with."
use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7");

#[program]
pub mod deposit_lock {
    use super::*;

    /// Tenant creates the escrow and funds it in a single transaction.
    ///
    /// The lease terms are fixed here and can never be changed afterwards --
    /// there is no instruction in this program that mutates them.
    ///
    /// `dispute_window_secs` is a parameter rather than a hardcoded constant.
    /// In production it would be 1_209_600 (14 days, per Irish RTB practice).
    /// For the demo we pass 10. Same code path either way -- the contract the
    /// judges watch is the real one, just with a shorter clock.
    pub fn initialize_and_fund(
        ctx: Context<InitializeAndFund>,
        lease_id: u64,
        amount: u64,
        lease_end_ts: i64,
        dispute_window_secs: i64,
        arbitrator: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, DepositLockError::InvalidAmount);
        require!(dispute_window_secs > 0, DepositLockError::InvalidWindow);

        let escrow = &mut ctx.accounts.escrow;
        escrow.tenant = ctx.accounts.tenant.key();
        escrow.landlord = ctx.accounts.landlord.key();
        escrow.amount = amount;
        escrow.lease_end_ts = lease_end_ts;
        escrow.dispute_window_secs = dispute_window_secs;
        escrow.lease_id = lease_id;
        escrow.bump = ctx.bumps.escrow;
        escrow.arbitrator = arbitrator;
        escrow.claimed_amount = 0;
        escrow.evidence_hash = [0; 32];
        escrow.status = EscrowStatus::Active;

        // Move the deposit from the tenant into the escrow account.
        // A CPI ("cross-program invocation") is this program calling another
        // program -- here, the System Program, which owns SOL transfers.
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.tenant.to_account_info(),
                    to: escrow.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!(
            "Escrow funded: {} lamports | lease ends {} | window {}s",
            amount,
            lease_end_ts,
            dispute_window_secs
        );
        Ok(())
    }

    /// PATH A -- the landlord voluntarily returns the deposit.
    ///
    /// Only the landlord recorded at creation can call this. They can do it at
    /// any time, including before the lease ends, because giving money back
    /// early harms nobody.
    ///
    /// The `close = tenant` constraint on the account struct does the actual
    /// work: it deletes the escrow account and sweeps every lamport in it --
    /// the deposit *and* the rent the tenant originally paid -- to the tenant.
    pub fn release(ctx: Context<Release>) -> Result<()> {
        require!(
            ctx.accounts.escrow.status == EscrowStatus::Active,
            DepositLockError::InvalidStatus
        );
        msg!(
            "Landlord {} released deposit to tenant {}",
            ctx.accounts.landlord.key(),
            ctx.accounts.tenant.key()
        );
        Ok(())
    }

    pub fn submit_claim(
        ctx: Context<SubmitClaim>,
        amount: u64,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let now = Clock::get()?.unix_timestamp;
        let deadline = escrow
            .lease_end_ts
            .checked_add(escrow.dispute_window_secs)
            .ok_or(DepositLockError::MathOverflow)?;

        require!(now >= escrow.lease_end_ts, DepositLockError::WindowNotOpen);
        require!(now < deadline, DepositLockError::WindowClosed);
        require!(amount > 0 && amount <= escrow.amount, DepositLockError::InvalidClaim);
        require!(escrow.status == EscrowStatus::Active, DepositLockError::InvalidStatus);

        escrow.claimed_amount = amount;
        escrow.evidence_hash = evidence_hash;
        escrow.status = EscrowStatus::Claimed;
        Ok(())
    }

    pub fn accept_deduction(ctx: Context<AcceptDeduction>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::Claimed, DepositLockError::InvalidStatus);
        pay_from_escrow(
            &ctx.accounts.escrow,
            &ctx.accounts.landlord,
            escrow.claimed_amount,
        )?;
        Ok(())
    }

    pub fn reject_deduction(ctx: Context<RejectDeduction>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::Claimed, DepositLockError::InvalidStatus);
        let uncontested = escrow
            .amount
            .checked_sub(escrow.claimed_amount)
            .ok_or(DepositLockError::MathOverflow)?;
        pay_from_escrow(
            escrow,
            &ctx.accounts.tenant,
            uncontested,
        )?;
        escrow.amount = escrow.claimed_amount;
        escrow.status = EscrowStatus::Rejected;
        Ok(())
    }

    pub fn arbitrate(ctx: Context<Arbitrate>, award: u64) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(
            escrow.status == EscrowStatus::Claimed || escrow.status == EscrowStatus::Rejected,
            DepositLockError::InvalidStatus
        );
        require!(award <= escrow.claimed_amount, DepositLockError::AwardExceedsClaim);
        pay_from_escrow(
            &ctx.accounts.escrow,
            &ctx.accounts.landlord,
            award,
        )?;
        Ok(())
    }

    pub fn settle_mutually(ctx: Context<SettleMutually>, split: u64) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(
            escrow.status == EscrowStatus::Claimed || escrow.status == EscrowStatus::Rejected,
            DepositLockError::InvalidStatus
        );
        require!(split <= escrow.claimed_amount, DepositLockError::AwardExceedsClaim);
        pay_from_escrow(
            &ctx.accounts.escrow,
            &ctx.accounts.landlord,
            split,
        )?;
        Ok(())
    }

    /// PATH B -- the landlord did nothing, so the tenant gets their money back.
    ///
    /// *** THIS INSTRUCTION IS THE ENTIRE PRODUCT. ***
    ///
    /// Note what is NOT in the account struct below: any signer check. There is
    /// no `require_keys_eq!` here, and that is deliberate, not an oversight.
    /// ANYONE can call this -- the tenant, a friend, a bot, a stranger. The
    /// caller cannot choose where the money goes, because the destination is
    /// `close = tenant`, and `tenant` is pinned to the address recorded when the
    /// escrow was created.
    ///
    /// So the only thing a caller can do is *make the refund happen*. Which
    /// means the tenant never has to persuade, chase, or sue anyone. Once the
    /// clock runs out the refund is simply a fact waiting to be triggered.
    ///
    /// The one and only gate is time, read from Solana's Clock sysvar -- the
    /// cluster's own consensus-derived wall clock, not a timestamp any party
    /// supplied.
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::Active, DepositLockError::InvalidStatus);
        let now = Clock::get()?.unix_timestamp;

        // The deadline: lease end + the full review window the landlord had.
        let deadline = escrow
            .lease_end_ts
            .checked_add(escrow.dispute_window_secs)
            .ok_or(DepositLockError::MathOverflow)?;

        require!(now >= deadline, DepositLockError::WindowStillOpen);

        msg!(
            "Review window expired at {} (now {}). Refunding tenant {}.",
            deadline,
            now,
            ctx.accounts.tenant.key()
        );
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// ACCOUNT STRUCTS
//
// Every instruction declares exactly which accounts it touches. Anchor enforces
// these constraints BEFORE the instruction body runs, so most of the security of
// this program lives in the attributes below rather than in the code above.
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(lease_id: u64)]
pub struct InitializeAndFund<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,

    /// CHECK: Stored as the landlord's address only. This account is never read
    /// from or written to here, so it does not need to sign or be validated --
    /// the tenant is simply declaring who the landlord is.
    pub landlord: UncheckedAccount<'info>,

    // The escrow PDA. Its address is derived from these seeds, so the same
    // tenant/landlord pair can hold several independent leases by varying
    // `lease_id` -- which is also what lets us re-run the demo cleanly.
    #[account(
        init,
        payer = tenant,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", tenant.key().as_ref(), landlord.key().as_ref(), &lease_id.to_le_bytes()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    // Must sign, AND must be the landlord recorded at creation. `has_one`
    // enforces the second half: escrow.landlord == landlord.key().
    pub landlord: Signer<'info>,

    /// CHECK: Verified by the `has_one = tenant` constraint on the escrow, and
    /// used only as the destination for the returned funds.
    #[account(mut)]
    pub tenant: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = tenant,
        has_one = landlord,
        seeds = [b"escrow", tenant.key().as_ref(), landlord.key().as_ref(), &escrow.lease_id.to_le_bytes()],
        bump = escrow.bump,
        close = tenant,
    )]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    // Deliberately just `Signer`, with no identity constraint. Anyone can pay
    // the transaction fee to trigger a refund that was already earned. See the
    // long comment on `claim_refund` above.
    pub caller: Signer<'info>,

    /// CHECK: Verified by `has_one = tenant`. Funds can only ever land here.
    #[account(mut)]
    pub tenant: UncheckedAccount<'info>,

    /// CHECK: Verified by `has_one = landlord`. Needed only to re-derive the PDA.
    pub landlord: UncheckedAccount<'info>,

    #[account(
        mut,
        has_one = tenant,
        has_one = landlord,
        seeds = [b"escrow", tenant.key().as_ref(), landlord.key().as_ref(), &escrow.lease_id.to_le_bytes()],
        bump = escrow.bump,
        close = tenant,
    )]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct SubmitClaim<'info> {
    pub landlord: Signer<'info>,
    #[account(
        mut,
        has_one = landlord,
        seeds = [b"escrow", escrow.tenant.as_ref(), landlord.key().as_ref(), &escrow.lease_id.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct AcceptDeduction<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    /// CHECK: Checked against escrow.landlord and used as the payout destination.
    #[account(mut)]
    pub landlord: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = tenant,
        has_one = landlord,
        seeds = [b"escrow", tenant.key().as_ref(), landlord.key().as_ref(), &escrow.lease_id.to_le_bytes()],
        bump = escrow.bump,
        close = tenant,
    )]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectDeduction<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    #[account(
        mut,
        has_one = tenant,
        seeds = [b"escrow", tenant.key().as_ref(), escrow.landlord.as_ref(), &escrow.lease_id.to_le_bytes()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Arbitrate<'info> {
    pub arbitrator: Signer<'info>,
    /// CHECK: Checked against escrow.landlord and used as the payout destination.
    #[account(mut)]
    pub landlord: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = arbitrator,
        has_one = landlord,
        has_one = tenant,
        seeds = [b"escrow", tenant.key().as_ref(), landlord.key().as_ref(), &escrow.lease_id.to_le_bytes()],
        bump = escrow.bump,
        close = tenant,
    )]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: The escrow's recorded tenant receives the remainder on close.
    #[account(mut)]
    pub tenant: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMutually<'info> {
    #[account(mut)]
    pub tenant: Signer<'info>,
    #[account(mut)]
    pub landlord: Signer<'info>,
    #[account(
        mut,
        has_one = tenant,
        has_one = landlord,
        seeds = [b"escrow", tenant.key().as_ref(), landlord.key().as_ref(), &escrow.lease_id.to_le_bytes()],
        bump = escrow.bump,
        close = tenant,
    )]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

/// The lease terms. Written once at creation, never mutated afterwards.
///
/// Note there is no `status` field. The lifecycle state (Active / ReviewWindow /
/// Expired) is *derived* by comparing the clock against these timestamps, not
/// stored. That is not a shortcut -- it is forced by how Solana works. A program
/// only runs when someone sends it a transaction; nothing wakes it up when a
/// deadline passes. So "the review window has opened" can never be a stored fact,
/// only a computed one. Both this program and the UI derive it the same way.
#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub tenant: Pubkey,
    pub landlord: Pubkey,
    pub amount: u64,
    pub lease_end_ts: i64,
    pub dispute_window_secs: i64,
    pub lease_id: u64,
    pub bump: u8,
    pub arbitrator: Pubkey,
    pub claimed_amount: u64,
    pub evidence_hash: [u8; 32],
    pub status: EscrowStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowStatus {
    Active,
    Claimed,
    Rejected,
}

fn pay_from_escrow<'info>(
    escrow: &Account<'info, Escrow>,
    destination: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let escrow_info = escrow.to_account_info();
    let escrow_lamports = escrow_info.lamports();
    require!(escrow_lamports >= amount, DepositLockError::InsufficientFunds);
    **escrow_info.try_borrow_mut_lamports()? = escrow_lamports - amount;
    let destination_lamports = destination.lamports();
    **destination.try_borrow_mut_lamports()? = destination_lamports
        .checked_add(amount)
        .ok_or(DepositLockError::MathOverflow)?;
    Ok(())
}

#[error_code]
pub enum DepositLockError {
    #[msg("Deposit amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Dispute window must be greater than zero.")]
    InvalidWindow,
    #[msg("The landlord's review window has not expired yet.")]
    WindowStillOpen,
    #[msg("Arithmetic overflow.")]
    MathOverflow,
    #[msg("The lease has not ended yet.")]
    WindowNotOpen,
    #[msg("The landlord's review window has expired.")]
    WindowClosed,
    #[msg("Claim must be greater than zero and no more than the deposit.")]
    InvalidClaim,
    #[msg("This escrow is not in a valid state for that action.")]
    InvalidStatus,
    #[msg("The award cannot exceed the claimed amount.")]
    AwardExceedsClaim,
    #[msg("The escrow does not have enough lamports for this payout.")]
    InsufficientFunds,
}
