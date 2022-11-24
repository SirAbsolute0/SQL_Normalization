params=process.argv[2];
if (process.argv.length==2) {
  console.log("Error: no parameters");
  process.exit();
}
else {
 l=params.split(";")
 param=[]
 for (i=0;i<l.length;i++)
   param[i]=l[i].split("=");

for (i=0;i<param.length;i++)
   console.log(param[0][1] + ' sep ' + i);

 if(param[1][1] == '' || param[2][1] == '')
 {
     console.log("invalid input")
     process.exit(1)
 }
}

var result = []
var for_PK = false
var for_1NF = false
var for_2NF = false
var for_3NF = false
var for_BCNF = false


function writeResult()
{
    if (for_PK == true)
    {result.push("PK    Y\n")}
    else {result.push("PK    N\n")}

    if (for_1NF == true)
    {result.push("1NF    Y\n")}
    else {result.push('1NF    N\n')}

    if(for_2NF == true)
    {result.push("2NF    Y\n")}
    else {result.push("2NF    N\n")}

    if(for_3NF == true)
    {result.push("3NF    Y\n")}
    else {result.push("3NF    N\n")}

    if(for_BCNF == true)
    {result.push("BCNF    Y\n")}
    else {result.push("BCNF    N\n")}

    var output = result.join(' ')
    output = output.replace(/^\s+|\s+$/gm,'')
    const fs = require('fs');
    var file = fs.writeFileSync('nf.txt', output, "utf8");
    var file = fs.writeFileSync('nf.sql', output, "utf8");
    
    test = param[1][1].split(",")
    console.log(test[1])
   
  
}

//Run all functions
function main(){
	writeResult()
}

main()