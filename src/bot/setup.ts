import { pool } from "@/db";

/**
 * Creates all database tables using raw SQL.
 * This runs automatically on first request - no drizzle-kit CLI needed.
 */
export async function ensureTablesExist(): Promise<boolean> {
  const client = await pool.connect();
  try {
    // Check if tables already exist
    const check = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')`
    );
    if (check.rows[0].exists) {
      console.log("✅ Database tables already exist.");
      return true;
    }

    console.log("🔨 Creating database tables...");

    // Create enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE investment_status AS ENUM ('active', 'completed', 'cancelled', 'pending');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE deposit_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'completed');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'investment', 'earning', 'referral_commission', 'admin_adjustment', 'refund');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id VARCHAR(64) NOT NULL UNIQUE,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        referral_code VARCHAR(32) NOT NULL UNIQUE,
        referred_by INTEGER REFERENCES users(id),
        balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
        total_invested DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
        total_earned DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
        total_referral_earnings DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
        is_admin BOOLEAN DEFAULT false NOT NULL,
        is_banned BOOLEAN DEFAULT false NOT NULL,
        wallet_address VARCHAR(255),
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create investment_plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS investment_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        min_amount DECIMAL(15,2) NOT NULL,
        max_amount DECIMAL(15,2) NOT NULL,
        duration_days INTEGER NOT NULL,
        expected_return_percent DECIMAL(5,2) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create investments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        plan_id INTEGER NOT NULL REFERENCES investment_plans(id),
        amount DECIMAL(15,2) NOT NULL,
        status investment_status DEFAULT 'pending' NOT NULL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        earnings DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
        prop_firm_name VARCHAR(255),
        prop_firm_account VARCHAR(255),
        profit_target DECIMAL(15,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create referrals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL REFERENCES users(id),
        referred_id INTEGER NOT NULL REFERENCES users(id),
        investment_id INTEGER REFERENCES investments(id),
        commission_amount DECIMAL(15,2) NOT NULL,
        commission_percent DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
        is_paid BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create deposits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount DECIMAL(15,2) NOT NULL,
        status deposit_status DEFAULT 'pending' NOT NULL,
        payment_method VARCHAR(50),
        transaction_hash VARCHAR(255),
        proof_file_id VARCHAR(255),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create withdrawals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount DECIMAL(15,2) NOT NULL,
        status withdrawal_status DEFAULT 'pending' NOT NULL,
        wallet_address VARCHAR(255),
        payment_method VARCHAR(50),
        transaction_hash VARCHAR(255),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type transaction_type NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        description TEXT,
        related_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create bot_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create broadcasts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        sent_count INTEGER DEFAULT 0 NOT NULL,
        failed_count INTEGER DEFAULT 0 NOT NULL,
        sent_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log("✅ All database tables created successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    return false;
  } finally {
    client.release();
  }
}
