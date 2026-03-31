import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function assignSubscription(email: string, planId: string) {
  console.log(`Assigning ${planId} subscription to ${email}...`);

  // Find user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id}`);

  // Check if subscription exists
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingSub) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        lemonsqueezy_variant_id: planId,
        status: 'active',
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      process.exit(1);
    }

    console.log(`✓ Updated subscription to ${planId}`);
  } else {
    // Create new subscription
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        lemonsqueezy_variant_id: planId,
        status: 'active',
      });

    if (insertError) {
      console.error('Error creating subscription:', insertError);
      process.exit(1);
    }

    console.log(`✓ Created ${planId} subscription`);
  }
}

const email = process.argv[2];
const planId = process.argv[3] || 'full';

if (!email) {
  console.error('Usage: tsx scripts/assign-subscription.ts <email> [plan_id]');
  console.error('Example: tsx scripts/assign-subscription.ts user@example.com full');
  process.exit(1);
}

assignSubscription(email, planId)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
