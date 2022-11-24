/*Phuong Dinh*/

//Function to take in parameter and put into param[]
params=process.argv[2];
if (process.argv.length==2) 
{
  console.log("Error: no parameters");
  process.exit();
}
else 
{
 l=params.split(";")
 param=[]
 for (i=0;i<l.length;i++)
   param[i]=l[i].split("=");

//Error checking for empty input for table, pk, and columns
 if(param[0][1] == '' || param[1][1] == '' || param[2][1] == '')
 {
     console.log("invalid input")
     process.exit(1)
 }
}

//Connect to server
const { Client} = require('pg')
const creds = require('./creds.json')

/*const client = new Client({
  host: creds.host,
  user: creds.user,
  password: creds.password,
  port: creds.port,
  database: creds.database
});*/ //unsued for now
const client = new Client({
    host: '3380.cs.uh.edu',
    user: 'dbs027',
    password: '1835957D',
    port: 5432,
    database: 'COSC3380'
  });
  
//A string array result to write the result of all queries to nf.txt
result = []
sql_result = []
var for_PK = false
var for_1NF = false
var for_2NF = false
var for_3NF = false
var for_BCNF = false

//Split composite keys and multiple columns to individual names
var indv_pk = param[1][1].split(",")
var indv_column = param[2][1].split(",")

//Check to see if there is repeated value in the pk and column
if (indv_pk.some(item => indv_column.includes(item)))
{
    console.log("invalid input")
    process.exit()
}

// First function to check if PK is valid by checking if there is repeated values in the given pk columns
async function checkPK(){
    //Check to see if the PK given is NULL	
	//q = await client.query
     //               ('SELECT * FROM ' + param[0][1]
      //                + ' WHERE ' + '(' + param[1][1] + ')' + ' IS NULL')

    //Check to see if the PK given is repeated
    var query = ('SELECT ' + param[1][1] + ',COUNT(*)'+ ' FROM ' + param[0][1] + '\n'  
                        + 'GROUP BY ' + param[1][1] + '\n'
                        + 'HAVING COUNT(*) > 1')
    p = await client.query(query)
    sql_result.push(query)

    if (p.rowCount > 0)
    {for_PK = false}
    else {for_PK = true}
}

//Second function
async function check1NF(){
    //Check to see if the rows in the table are repeated
    var query = ('SELECT ' + param[1][1] + ',' + param[2][1] + ',COUNT(*)' + ' FROM ' + param[0][1] + '\n'
                        + 'GROUP BY ' + param[1][1] + ',' + param[2][1] + '\n'
                        + 'HAVING COUNT(*) > 1')
	q = await client.query(query)
    sql_result.push(query)

    if (q.rowCount > 0)
    {for_1NF = false}
    else {for_1NF = true}
}

//Function to check if the table is in 2nf
async function check2NF(){
    //if the pk is valid, table is in 1nf, and there is only one pk => automatically qualify to be in 2nf
    if (for_PK == true && indv_pk.length == 1 && for_1NF == true)
    {
        for_2NF = true
        return
    }

    //Check partial dependency
    if(for_PK == true && for_1NF == true)
    {
        for (var i = 0; i < indv_pk.length; i++)
        {
            for (var y = 0; y < indv_column.length; y++)
            {
                //Check each pk column against each non-pk column to see if there is partial dependency
                var query = ('SELECT ' + indv_pk[i] + ',COUNT(DISTINCT ' + indv_column[y] + ') FROM ' + param[0][1] + '\n'
                                + 'GROUP BY ' + indv_pk[i] + '\n'
                                + 'HAVING COUNT(DISTINCT ' + indv_column[y] + ')>1')
                q = await client.query(query)
                sql_result.push(query)
                    
                if (q.rowCount > 0)
                {for_2NF = true}
                else 
                {
                    for_2NF = false
                    return;
                }
            }
        } 
    }
}

//Function to check if the table is in 3nf
async function check3NF(){
    //if the column only has one column and is in 2nf => automatically qualify for 3nf
    if (for_2NF == true && indv_column.length == 1)
    {
        for_3NF = true
        return
    } 

    //Check for transitive dependency
    if (for_2NF == true)
    {
        for (var i = 0; i < indv_column.length; i++)
        {
            for (var y = 0; y < indv_column.length; y++)
            {
                if (i == y)
                {}
                else
                {
                    //Check each non-pk column with each other to see if they have FD
                    var query = ('SELECT ' + indv_column[i] + ',COUNT(DISTINCT ' + indv_column[y] + ') FROM ' + param[0][1] + '\n'
                                    + 'GROUP BY ' + indv_column[i] + '\n' 
                                    + 'HAVING COUNT(DISTINCT ' + indv_column[y] + ')>1')
                    q = await client.query(query)
                    sql_result.push(query)

                    if (q.rowCount > 0)
                    {   for_3NF = true  }
                    else 
                    {
                        for_3NF = false
                        return
                    }
                }
            }
        }
    }
}

//Function to check if the table is in BCNF
async function checkBCNF(){
    //If the table is in 3nf and there is only 1 non-key column => automatically in bcnf
    if (for_3NF == true && indv_column.length == 1)
    {
        for_BCNF = true                     //Might need further checking
        return
    }
    if(for_3NF == true)
    {
        //Check to see if non-pk column can uniquely identify pk column
        for (var i = 0; i < indv_column.length; i++)
        {
            for (var y = 0; y < indv_pk.length; y++)
            {
                var query = ('SELECT ' + indv_column[i] + ',COUNT(DISTINCT ' + indv_pk[y] + ') FROM ' + param[0][1] + '\n'
                                + 'GROUP BY ' + indv_column[i] + '\n'
                                + 'HAVING COUNT(DISTINCT ' + indv_pk[y] + ')>1')
                q = await client.query(query)
                sql_result.push(query)
                    
                if (q.rowCount > 0)
                {   for_BCNF = true}
                else 
                {
                    for_BCNF = false
                    return
                }
            }
        }
    }
}

//Check all result from queries and then write to nf.txt (overwriting previous nf.txt)
function writeResult()
{
    if (for_PK == true)
    {result.push("PK      Y\n")}
    else {result.push("PK      N\n")}

    if (for_1NF == true)
    {result.push("1NF     Y\n")}
    else {result.push("1NF     N\n")}

    if(for_2NF == true)
    {result.push("2NF     Y\n")}
    else {result.push("2NF     N\n")}

    if(for_3NF == true)
    {result.push("3NF     Y\n")}
    else {result.push("3NF     N\n")}

    if(for_BCNF == true)
    {result.push("BCNF    Y\n")}
    else {result.push("BCNF    N\n")}

    var output = result.join(' ')
    output = output.replace(/^\s+|\s+$/gm,'')
    const fs = require('fs');
    fs.writeFileSync('nf.txt', output, "utf8");

    var output_sql = sql_result.join(';\n')
    output_sql = output_sql.replace(/^\s+|\s+$/gm,'')
    fs.writeFileSync('nf.sql', output_sql, "utf8");
}

//Run all functions
async function main(){
	client.connect()
    try
    {
        await checkPK()
        await check1NF()
        await check2NF()
        await check3NF()
        await checkBCNF()
        console.log("success")
    }
    catch(err)
    {   console.log("Failed to connect to the server.")}
	client.end()
    writeResult()
}

main()