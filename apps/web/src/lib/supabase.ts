import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the company schema for the current authenticated user
 */
export async function getCompanySchema(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        throw new Error('No authenticated user');
    }

    // Get user metadata which contains company_id
    const companyId = session.user.user_metadata?.company_id;

    if (!companyId) {
        throw new Error('No company_id found in user metadata');
    }

    return `company_${companyId}`;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

/**
 * Insert a row into a company-scoped table
 */
export async function insertCompanyTable(tableName: string, data: any) {
    const schema = await getCompanySchema();
    const { data: result, error } = await supabase
        .schema(schema)
        .from(tableName)
        .insert(data)
        .select()
        .single();

    if (error) throw error;
    return result;
}

/**
 * Update a row in a company-scoped table
 */
export async function updateCompanyTable(tableName: string, id: string, data: any) {
    const schema = await getCompanySchema();
    const { data: result, error } = await supabase
        .schema(schema)
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return result;
}

/**
 * Delete a row from a company-scoped table
 */
export async function deleteCompanyTable(tableName: string, id: string) {
    const schema = await getCompanySchema();
    const { error } = await supabase
        .schema(schema)
        .from(tableName)
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata,
        },
    });

    if (error) throw error;
    return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}
