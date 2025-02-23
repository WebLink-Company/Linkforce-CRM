import { supabase } from '../supabase';

// Base API class that all other API classes should extend
export class BaseAPI {
  protected table: string;
  protected schema: string;

  constructor(table: string) {
    this.table = table;
    this.schema = this.getCurrentSchema();
  }

  protected get query() {
    return supabase.schema(this.schema).from(this.table);
  }

  // Get current schema from supabase client
  protected getCurrentSchema(): string {
    const headers = supabase.headers;
    return headers['x-schema-name'] as string || 'public';
  }

  // Example base methods that use the correct schema
  async findAll() {
    const { data, error } = await this.query.select('*');
    return { data, error };
  }

  async findOne(id: string) {
    const { data, error } = await this.query
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  }

  async create(data: any) {
    const { data: result, error } = await this.query
      .insert([data])
      .select()
      .single();
    return { data: result, error };
  }

  async update(id: string, data: any) {
    const { data: result, error } = await this.query
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return { data: result, error };
  }

  async delete(id: string) {
    const { error } = await this.query.delete().eq('id', id);
    return { error };
  }

  // Helper method to execute RPC functions in the correct schema
  protected async rpc(functionName: string, params?: Record<string, any>) {
    return await supabase.rpc(functionName, params);
  }
}