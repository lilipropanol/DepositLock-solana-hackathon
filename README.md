rachelranjith@Rachels-MacBook-Air-5 DepositLock % git remote remove origin
error: No such remote: 'origin'
rachelranjith@Rachels-MacBook-Air-5 DepositLock % git remote -v
rachelranjith@Rachels-MacBook-Air-5 DepositLock % git remote add origin https://github.com/lilipropanol/DepositLock-solana-hackathon.git
rachelranjith@Rachels-MacBook-Air-5 DepositLock % git push
fatal: The current branch main has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin main

To have this happen automatically for branches without a tracking
upstream, see 'push.autoSetupRemote' in 'git help config'.

rachelranjith@Rachels-MacBook-Air-5 DepositLock % git push --set-upstream origin main
To https://github.com/lilipropanol/DepositLock-solana-hackathon.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'https://github.com/lilipropanol/DepositLock-solana-hackathon.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
rachelranjith@Rachels-MacBook-Air-5 DepositLock % git pull
remote: Enumerating objects: 3, done.
remote: Counting objects: 100% (3/3), done.
remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)
Unpacking objects: 100% (3/3), 898 bytes | 299.00 KiB/s, done.
From https://github.com/lilipropanol/DepositLock-solana-hackathon
 * [new branch]      main       -> origin/main
There is no tracking information for the current branch.
Please specify which branch you want to merge with.
See git-pull(1) for details.

    git pull <remote> <branch>

If you wish to set tracking information for this branch you can do so with:

    git branch --set-upstream-to=origin/<branch> main

rachelranjith@Rachels-MacBook-Air-5 DepositLock % git push --force
fatal: The current branch main has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin main

To have this happen automatically for branches without a tracking
upstream, see 'push.autoSetupRemote' in 'git help config'.

rachelranjith@Rachels-MacBook-Air-5 DepositLock % git push --set-upstream origin main        
To https://github.com/lilipropanol/DepositLock-solana-hackathon.git
 ! [rejected]        main -> main (non-fast-forward)
error: failed to push some refs to 'https://github.com/lilipropanol/DepositLock-solana-hackathon.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
rachelranjith@Rachels-MacBook-Air-5 DepositLock % git pull       
There is no tracking information for the current branch.
Please specify which branch you want to merge with.
See git-pull(1) for details.

    git pull <remote> <branch>

If you wish to set tracking information for this branch you can do so with:

    git branch --set-upstream-to=origin/<branch> main

rachelranjith@Rachels-MacBook-Air-5 DepositLock % 