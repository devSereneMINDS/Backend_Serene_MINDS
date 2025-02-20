// config/pg.js
import pkg from 'pg';
const { Client } = pkg;

let client;

const getClient = () => {
    if (!client) {
        client = new Client({
            host: 'aws-0-ap-south-1.pooler.supabase.com',
            port: 6543,
            user: 'postgres.qmdfzzfphkfybewcyhej',
            password: 'sereneminds__db',
            database: 'postgres',
        });
    }
    return client;
};

const connectDb = async () => {
    const client = getClient();
    if (!client._connected) {
        await client.connect();
    }
    return client;
};

export { connectDb, getClient };
