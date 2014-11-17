cat 2014-students.csv |
awk -F ',' '{print $1}' |
tr -d '"' |
while read id
do
echo '"Year" "JAN" "FEB" "MAR" "APR" "MAY" "JUN" "JUL" "AUG" "SEP" "OCT" "NOV" "DEC"' > output/ClimateData/ClimateData_$id.txt

start=$((RANDOM%20+1))
end=$((RANDOM%20+1))
realend=$(expr 97 - $start - $end)

awk -v initial_line=$start -v end_line=$realend '{
    if (NR >= initial_line && NR <= end_line)
    print $0
}' rawClimateData >> output/ClimateData/ClimateData_$id.txt
done
