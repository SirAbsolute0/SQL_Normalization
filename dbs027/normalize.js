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
}

//Connect to server
const { Client} = require('pg')
const creds = require('./creds.json')

const client = new Client({
  host: creds.host,
  user: creds.user,
  password: creds.password,
  port: creds.port,
  database: creds.database
}); 

//A string array result to write the result of all queries to nf.txt
result = []
sql_result = []
var error = false
result.push(param[0][1])
sql_result.push(param[0][1] + '\n')

var for_PK = false
var for_1NF = false
var for_2NF = false
var for_3NF = false
var for_BCNF = false

var indv_pk 
var indv_column

async function checkError() 
{
    //Error checking for empty input for table, pk, and columns
    if(param[0][1] == '' || param[1][1] == '' || param[2][1] == '')
    {
        //console.log("invalid input")
        //process.exit()
        result.push(": Invalid Input")
        error = true
        throw new Error("Missing table/pk/column")
    }

    //Split composite keys and multiple columns to individual names
    indv_pk = param[1][1].split(",")
    indv_column = param[2][1].split(",")

    //Check to see if there is repeated name in the pk and column
    if (indv_pk.some(item => indv_column.includes(item)))
    {
        //console.log("invalid input")
        //process.exit()
        result.push(": Invalid Input")
        error = true
        throw new Error("Repeated name in pk/column")
    }

    //Check to see if there are more than 3 pks
    if (indv_pk.length >= 3)
    {
        result.push(": Invalid Input")
        error = true
        throw new Error("pk has 3 or more values")
    }

    //Check to see if all the pk and column exist in the table
    var query1 = ('SELECT ' + param[1][1] + ',' + param[2][1] + ' FROM ' + param[0][1])
    sql_result.push(query1)
    try
    {   p = await client.query(query1)  }
    catch
    {   
        result.push(": Invalid Input")
        error = true
        throw new Error("Given pk, column does not exist in table")
    }

    //Check to see if table has 0 or only 1 row
    var query = ('SELECT * FROM ' + param[0][1])
    sql_result.push(query)
    q = await client.query(query)
    if(q.rowCount == 0)
    {
        result.push(": Empty Table")
        error = true
        throw new Error("Empty Table Error")
    }
    else if (q.rowCount == 1)
    {
        result.push(": Single Row Table")
        error = true
        throw new Error("Single Row Table Error")
    }
}
//Check pk validity
async function checkPK(){
    //Check to see if the PK given is NULL	
	//q = await client.query
     //               ('SELECT * FROM ' + param[0][1]
      //                + ' WHERE ' + '(' + param[1][1] + ')' + ' IS NULL')

    //Check to see if there is repeated value in the pk
    var query = ('SELECT ' + param[1][1] + ',COUNT(*)'+ ' FROM ' + param[0][1] + '\n'  
                        + 'GROUP BY ' + param[1][1] + '\n'
                        + 'HAVING COUNT(*) > 1')
    p = await client.query(query)
    sql_result.push(query)

    if (p.rowCount > 0)
    {   for_PK = false  }
    else {  for_PK = true   }
}

//Check if the table is in 1nf
async function check1NF(){
    //Check to see if the rows in the table are repeated
    var query = ('SELECT ' + param[1][1] + ',' + param[2][1] + ',COUNT(*)' + ' FROM ' + param[0][1] + '\n'
                        + 'GROUP BY ' + param[1][1] + ',' + param[2][1] + '\n'
                        + 'HAVING COUNT(*) > 1')
	q = await client.query(query)
    sql_result.push(query)

    if (q.rowCount > 0)
    {   for_1NF = false }
    else {  for_1NF = true  }
}

//Get rid of ck if existed
async function checkCK(){
    //Check to see if the all the values in the column is unquie 
    var need_delete = []
    for (var i = 0; i < indv_column.length; i++)
    {
        var query = ('SELECT ' + indv_column[i] + ',COUNT(*)' + ' FROM ' + param[0][1] + '\n'
                            + 'GROUP BY ' + indv_column[i] + '\n'
                            + 'HAVING COUNT(*) > 1')
        q = await client.query(query)
        sql_result.push(query)
        
        if(q.rowCount > 0)
        {}
        else 
        {   need_delete.push(indv_column[i]) }
    }

    for (var i = 0; i < need_delete.length; i++)
    {
        var index = indv_column.indexOf(need_delete[i])
        indv_column.splice(index, 1)
    }
    
}

//Function to check if the table is in 2nf
async function check2NF(){
    //if the pk is valid, table is in 1nf, and there is only one pk or there is no column => automatically qualify to be in 2nf
    if ((for_PK == true && for_1NF == true && indv_pk.length == 1) || (for_PK == true && for_1NF == true && indv_column.length == 0))
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
                                + 'HAVING COUNT(DISTINCT ' + indv_column[y] + ') > 1')
                q = await client.query(query)
                sql_result.push(query)
                    
                if (q.rowCount > 0)
                {   for_2NF = true  } 
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
    //if the table is in 2nf and has one or zero non-key column => automatically qualify for 3nf
    if (for_2NF == true && indv_column.length <= 1)
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
    //If the table is in 3nf and there is one or zero non-key column => automatically in bcnf
    if (for_3NF == true && indv_column.length == 0)
    {
        for_BCNF = true                     
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
    if (error == false)
    {
        if (for_PK == true)
        {result.push("\npk      Y\n")}
        else {result.push("\npk      N\n")}
    
        if (for_1NF == true)
        {result.push("1nf     Y\n")}
        else {result.push("1nf     N\n")}
    
        if(for_2NF == true)
        {result.push("2nf     Y\n")}
        else {result.push("2nf     N\n")}
    
        if(for_3NF == true)
        {result.push("3nf     Y\n")}
        else {result.push("3nf     N\n")}
    
        if(for_BCNF == true)
        {result.push("bcnf    Y\n")}
        else {result.push("bcnf    N\n")}
    }
    var output = result.join('')
    output = output.replace(/^\s+|\s+$/gm,'')
    const fs = require('fs');
    fs.appendFileSync('nf.txt', '\n' + output + '\n', "utf8");

    var output_sql = sql_result.join(';\n')
    output_sql = output_sql.replace(/^\s+|\s+$/gm,'')
    fs.appendFileSync('nf.sql', '\n' + output_sql + '\n', "utf8");
}

//Run all functions
async function main(){
	client.connect()
    try
    {
        await checkError()
        await checkPK()
        await check1NF()
        await checkCK()
        await check2NF()
        await check3NF()
        await checkBCNF()
        console.log("success")
    }
    catch(err)
    {   
        console.log("Failed to connect to the server.")
        writeResult()
        client.end()
        process.exit()
    }
	client.end()
    writeResult()
}

main()