// db.js
import postgres from 'postgres'

const connectionString = "postgresql://postgres.qmdfzzfphkfybewcyhej:sereneminds__db@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
const sql = postgres(connectionString)

export default sql
