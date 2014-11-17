cat 2014-students.csv |
awk -F ',' '{print $1}' |
tr -d '"' |
while read id
do echo '"query" "virus.name" "blastx.hitorganism" "blastx.evalue" "blastn.hitorganism" "blastn.evalue"' > output/VirusData/VirusData_$id.txt
cat VirusData_* | grep -v evalue |
perl -MList::Util=shuffle -e 'print shuffle(<STDIN>);' |
head -n 106 >> output/VirusData/VirusData_$id.txt
done
