import { supabase } from '../supabase';

// Base API class that all other API classes should extend
export class BaseAPI {
  protected table: string;

  constructor(table: string) {
    this.table = table;
  }

  // Create query builder
  protected createSchemaBuilder(table?: string) {
    return supabase.from(table || this.table);
  }

  // Example base methods
  async findAll() {
    const { data, error } = await this.createSchemaBuilder().select('*');
    return { data, error };
  }

  async findOne(id: string) {
    const { data, error } = await this.createSchemaBuilder()
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  }

  async create(data: any) {
    const { data: result, error } = await this.createSchemaBuilder()
      .insert([data])
      .select()
      .single();
    return { data: result, error };
  }

  async update(id: string, data: any) {
    const { data: result, error } = await this.createSchemaBuilder()
      .update(data)
      .eq('id', id)
      .select()
      .single();
    return { data: result, error };
  }

  async delete(id: string) {
    const { error } = await this.createSchemaBuilder().delete().eq('id', id);
    return { error };
  }

  // Helper method to execute RPC functions
  protected async rpc(functionName: string, params?: Record<string, any>) {
    return await supabase.rpc(functionName, params);
  }
}