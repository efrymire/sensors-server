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