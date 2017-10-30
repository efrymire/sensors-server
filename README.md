# Sensor Data Code Documentation
### Weekly Assignment 9, Due October 30 at 4PM

I managed to add details to my database, but I did not use environment variables. 
I cloned my script into EC2, then I used VIM to update the acces token and password on my machine so 
the sensitive information isn't on github. 

**Code:**
```js
var request = require('request');
const { Client } = require('pg');

// PARTICLE PHOTON
var device_id = '210023001247343432313031';
var access_token = process.env.PHOTON_TOKEN;
var particle_variable = 'json';
var device_url = 'https://api.particle.io/v1/devices/' + device_id + '/' + particle_variable + '?access_token=' + access_token;

console.log(device_url)

// AWS RDS POSTGRESQL INSTANCE
var db_credentials = new Object();
db_credentials.user = 'ellie';
db_credentials.host = 'datastructures.cvnlstce0av9.us-east-2.rds.amazonaws.com';
db_credentials.database = 'sensors';
db_credentials.password = process.env.AWSRDS_PW;
db_credentials.port = 5432;

var getAndWriteData = function() {
    // Make request to the Particle API to get sensor values
    request(device_url, function(error, response, body) {
        // Store sensor values in variables
        var device_json_string = JSON.parse(body).result;
        var ir = JSON.parse(device_json_string).ir;
        var tempC = JSON.parse(device_json_string).temp;

        console.log(device_json_string);
        console.log(ir);
        console.log(tempC);
        
        // Connect to the AWS RDS Postgres database
        const client = new Client(db_credentials);
        client.connect();

        // Construct a SQL statement to insert sensor values into a table
        var thisQuery = "INSERT INTO sensordata VALUES (" + ir + "," + tempC + ", DEFAULT);";
        console.log(thisQuery); // for debugging

        // Connect to the AWS RDS Postgres database and insert a new row of sensor values
        client.query(thisQuery, (err, res) => {
            console.log(err, res);
            client.end();
        });
    });
};

// write a new row of sensor data every five seconds
setInterval(getAndWriteData, 50000);
```

Once I set the environment variables, I was recieving this error through pm2: 

```js
0|add-sens | SyntaxError: Unexpected token u in JSON at position 0
```

This was because the URL that the code creates wasn't picking up my access_token environment variable, therefore was "undefined"

I then used vim to edit the access_token and password and the code was successful. 

Output from my databased as of 2:30pm:

```js
sensors=> SELECT * FROM sensordata;
 irsensor | tempsensor |         sensortime         
----------+------------+----------------------------
        0 |         22 | 2017-10-30 18:27:57.399433
        0 |         22 | 2017-10-30 18:28:47.383102
        0 |         22 | 2017-10-30 18:29:37.38869
        0 |         22 | 2017-10-30 18:30:27.395408
        0 |         22 | 2017-10-30 18:31:17.364439
        0 |         22 | 2017-10-30 18:32:07.360596
        0 |         22 | 2017-10-30 18:32:57.439651
        0 |         22 | 2017-10-30 18:33:47.432937
        0 |         22 | 2017-10-30 18:34:37.438541
        0 |         22 | 2017-10-30 18:35:27.44467
        0 |         22 | 2017-10-30 18:36:17.411994
        0 |         20 | 2017-10-30 18:37:07.389123
        0 |         19 | 2017-10-30 18:37:57.496096
```
