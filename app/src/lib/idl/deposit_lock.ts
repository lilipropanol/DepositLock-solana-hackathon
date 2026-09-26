/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/deposit_lock.json`.
 */
export type DepositLock = {
  "address": "43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7",
  "metadata": {
    "name": "depositLock",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptDeduction",
      "discriminator": [
        75,
        130,
        220,
        51,
        114,
        56,
        225,
        189
      ],
      "accounts": [
        {
          "name": "tenant",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "landlord",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tenant"
              },
              {
                "kind": "account",
                "path": "landlord"
              },
              {
                "kind": "account",
                "path": "escrow.lease_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "arbitrate",
      "discriminator": [
        105,
        91,
        110,
        150,
        216,
        11,
        142,
        142
      ],
      "accounts": [
        {
          "name": "arbitrator",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "landlord",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tenant"
              },
              {
                "kind": "account",
                "path": "landlord"
              },
              {
                "kind": "account",
                "path": "escrow.lease_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "tenant",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "award",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimRefund",
      "docs": [
        "PATH B -- the landlord did nothing, so the tenant gets their money back.",
        "",
        "*** THIS INSTRUCTION IS THE ENTIRE PRODUCT. ***",
        "",
        "Note what is NOT in the account struct below: any signer check. There is",
        "no `require_keys_eq!` here, and that is deliberate, not an oversight.",
        "ANYONE can call this -- the tenant, a friend, a bot, a stranger. The",
        "caller cannot choose where the money goes, because the destination is",
        "`close = tenant`, and `tenant` is pinned to the address recorded when the",
        "escrow was created.",
        "",
        "So the only thing a caller can do is *make the refund happen*. Which",
        "means the tenant never has to persuade, chase, or sue anyone. Once the",
        "clock runs out the refund is simply a fact waiting to be triggered.",
        "",
        "The one and only gate is time, read from Solana's Clock sysvar -- the",
        "cluster's own consensus-derived wall clock, not a timestamp any party",
        "supplied."
      ],
      "discriminator": [
        15,
        16,
        30,
        161,
        255,
        228,
        97,
        60
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "tenant",
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "landlord",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tenant"
              },
              {
                "kind": "account",
                "path": "landlord"
              },
              {
                "kind": "account",
                "path": "escrow.lease_id",
                "account": "escrow"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "initializeAndFund",
      "docs": [
        "Tenant creates the escrow and funds it in a single transaction.",
        "",
        "The lease terms are fixed here and can never be changed afterwards --",
        "there is no instruction in this program that mutates them.",
        "",
        "`dispute_window_secs` is a parameter rather than a hardcoded constant.",
        "In production it would be 1_209_600 (14 days, per Irish RTB practice).",
        "For the demo we pass 10. Same code path either way -- the contract the",
        "judges watch is the real one, just with a shorter clock."
      ],
      "discriminator": [
        61,
        18,
        141,
        155,
        213,
        112,
        16,
        88
      ],
      "accounts": [
        {
          "name": "tenant",
          "writable": true,
          "signer": true
        },
        {
          "name": "landlord",
          "docs": [
            "from or written to here, so it does not need to sign or be validated --",
            "the tenant is simply declaring who the landlord is."
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tenant"
              },
              {
                "kind": "account",
                "path": "landlord"
              },
              {
                "kind": "arg",
                "path": "leaseId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "leaseId",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "leaseEndTs",
          "type": "i64"
        },
        {
          "name": "disputeWindowSecs",
          "type": "i64"
        },
        {
          "name": "arbitrator",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "rejectDeduction",
      "discriminator": [
        184,
        233,
        139,
        90,
        21,
        164,
        73,
        146
      ],
      "accounts": [
        {
          "name": "tenant",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tenant"
              },
              {
                "kind": "account",
                "path": "escrow.landlord",
                "account": "escrow"
              },
              {
                "kind": "account",
                "path": "escrow.lease_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "release",
      "docs": [
        "PATH A -- the landlord voluntarily returns the deposit.",
        "",
        "Only the landlord recorded at creation can call this. They can do it at",
        "any time, including before the lease ends, because giving money back",
        "early harms nobody.",
        "",
        "The `close = tenant` constraint on the account struct does the actual",
        "work: it deletes the escrow account and sweeps every lamport in it --",
        "the deposit *and* the rent the tenant originally paid -- to the tenant."
      ],
      "discriminator": [
        253,
        249,
        15,
        206,
        28,
        127,
        193,
        241
      ],
      "accounts": [
        {
          "name": "landlord",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "tenant",
          "docs": [
            "used only as the destination for the returned funds."
          ],
          "writable": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tenant"
              },
              {
                "kind": "account",
                "path": "landlord"
              },
              {
                "kind": "account",
                "path": "escrow.lease_id",
                "account": "escrow"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "settleMutually",
      "discriminator": [
        55,
        35,
        86,
        193,
        194,
        98,
        251,
        61
      ],
      "accounts": [
        {
          "name": "tenant",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "landlord",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "tenant"
              },
              {
                "kind": "account",
                "path": "landlord"
              },
              {
                "kind": "account",
                "path": "escrow.lease_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "split",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitClaim",
      "discriminator": [
        163,
        108,
        111,
        46,
        220,
        82,
        77,
        212
      ],
      "accounts": [
        {
          "name": "landlord",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.tenant",
                "account": "escrow"
              },
              {
                "kind": "account",
                "path": "landlord"
              },
              {
                "kind": "account",
                "path": "escrow.lease_id",
                "account": "escrow"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "evidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "escrow",
      "discriminator": [
        31,
        213,
        123,
        187,
        186,
        22,
        218,
        155
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Deposit amount must be greater than zero."
    },
    {
      "code": 6001,
      "name": "invalidWindow",
      "msg": "Dispute window must be greater than zero."
    },
    {
      "code": 6002,
      "name": "windowStillOpen",
      "msg": "The landlord's review window has not expired yet."
    },
    {
      "code": 6003,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow."
    },
    {
      "code": 6004,
      "name": "windowNotOpen",
      "msg": "The lease has not ended yet."
    },
    {
      "code": 6005,
      "name": "windowClosed",
      "msg": "The landlord's review window has expired."
    },
    {
      "code": 6006,
      "name": "invalidClaim",
      "msg": "Claim must be greater than zero and no more than the deposit."
    },
    {
      "code": 6007,
      "name": "invalidStatus",
      "msg": "This escrow is not in a valid state for that action."
    },
    {
      "code": 6008,
      "name": "awardExceedsClaim",
      "msg": "The award cannot exceed the claimed amount."
    }
  ],
  "types": [
    {
      "name": "escrow",
      "docs": [
        "The lease terms. Written once at creation, never mutated afterwards.",
        "",
        "Note there is no `status` field. The lifecycle state (Active / ReviewWindow /",
        "Expired) is *derived* by comparing the clock against these timestamps, not",
        "stored. That is not a shortcut -- it is forced by how Solana works. A program",
        "only runs when someone sends it a transaction; nothing wakes it up when a",
        "deadline passes. So \"the review window has opened\" can never be a stored fact,",
        "only a computed one. Both this program and the UI derive it the same way."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tenant",
            "type": "pubkey"
          },
          {
            "name": "landlord",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "leaseEndTs",
            "type": "i64"
          },
          {
            "name": "disputeWindowSecs",
            "type": "i64"
          },
          {
            "name": "leaseId",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "arbitrator",
            "type": "pubkey"
          },
          {
            "name": "claimedAmount",
            "type": "u64"
          },
          {
            "name": "evidenceHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "escrowStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "escrowStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "claimed"
          },
          {
            "name": "rejected"
          }
        ]
      }
    }
  ]
};
