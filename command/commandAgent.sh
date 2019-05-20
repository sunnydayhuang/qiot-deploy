
export PYTHONUNBUFFERED=1
./command_$1.sh 2> $2 > $3 &
ps x -o "%p %r" | grep $! | awk {'print $2'} > pid_$1.txt
