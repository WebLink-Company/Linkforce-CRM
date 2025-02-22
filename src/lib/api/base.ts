import { supabase, getCurrentSchema } from '../supabase';

// Base API class that all other API classes should extend
export class BaseAPI {
  protected table: string;
  protected schema: string;

  constructor(table: string) {
    this.table = table;
    this.schema = getCurrentSchema();
  }

  protected get query() {
    return supabase.schema(this.schema).from(this.table);
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
}