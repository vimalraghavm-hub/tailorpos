import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const measurementTemplatesService = {
  async getMeasurementTemplates(shopId) {
    if (!isSupabaseConfigured) return null;

    const { data: templates, error: tErr } = await supabase
      .from('measurement_templates')
      .select('*, fields:measurement_template_fields(*)')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true });

    if (tErr) {
      console.error('Error fetching measurement templates:', tErr);
      return null;
    }

    return templates.map(t => {
      const activeFields = (t.fields || [])
        .filter(f => f.is_active)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        category: t.category || 'General',
        is_system_default: Boolean(t.is_system_default),
        is_active: Boolean(t.is_active),
        sort_order: t.sort_order || 1,
        fields: activeFields.map(f => ({
          id: f.id,
          key: f.field_key,
          label: f.field_name,
          unit: f.unit || 'inches',
          type: f.field_type || 'number',
          placeholder: f.placeholder || '',
          required: Boolean(f.required),
          sortOrder: f.sort_order || 1
        }))
      };
    });
  },

  async saveMeasurementTemplate(shopId, templateData) {
    if (!isSupabaseConfigured) return { success: false, error: 'Database unconfigured' };

    const cleanName = templateData.name.trim();
    const slug = templateData.slug ? templateData.slug.toLowerCase().trim() : cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    let tmpl, tmplErr;

    if (templateData.id) {
      const updateData = {
        name: cleanName,
        category: templateData.category || 'General',
        is_active: templateData.is_active !== undefined ? Boolean(templateData.is_active) : true,
        updated_at: new Date().toISOString()
      };
      if (templateData.slug) updateData.slug = templateData.slug;

      const res = await supabase
        .from('measurement_templates')
        .update(updateData)
        .eq('id', templateData.id)
        .eq('shop_id', shopId)
        .select()
        .single();

      tmpl = res.data;
      tmplErr = res.error;
    } else {
      const res = await supabase
        .from('measurement_templates')
        .upsert({
          shop_id: shopId,
          name: cleanName,
          slug,
          category: templateData.category || 'General',
          is_system_default: Boolean(templateData.is_system_default),
          is_active: templateData.is_active !== undefined ? Boolean(templateData.is_active) : true,
          sort_order: templateData.sort_order || 10,
          updated_at: new Date().toISOString()
        }, { onConflict: 'shop_id, slug' })
        .select()
        .single();

      tmpl = res.data;
      tmplErr = res.error;
    }

    if (tmplErr || !tmpl) {
      console.error('Error saving measurement template:', tmplErr);
      return { success: false, error: tmplErr?.message || 'Failed to save template' };
    }

    // 2. Upsert template fields
    if (Array.isArray(templateData.fields) && templateData.fields.length > 0) {
      const fieldsToUpsert = templateData.fields.map((f, idx) => ({
        id: f.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
        template_id: tmpl.id,
        field_name: f.label.trim(),
        field_key: f.key ? f.key.trim() : f.label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        unit: f.unit || 'inches',
        field_type: f.type || 'number',
        placeholder: f.placeholder || '',
        required: Boolean(f.required),
        sort_order: f.sortOrder || idx + 1,
        is_active: f.is_active !== undefined ? Boolean(f.is_active) : true,
        updated_at: new Date().toISOString()
      }));

      const { error: fieldsErr } = await supabase
        .from('measurement_template_fields')
        .upsert(fieldsToUpsert, { onConflict: 'template_id, field_key' });

      if (fieldsErr) {
        console.error('Error saving measurement template fields:', fieldsErr);
      }
    }

    return { success: true, data: tmpl };
  },

  async renameMeasurementTemplate(shopId, templateId, newName) {
    if (!isSupabaseConfigured || !templateId || !newName) return { success: false, error: 'Invalid data' };
    const cleanName = newName.trim();
    const { data, error } = await supabase
      .from('measurement_templates')
      .update({
        name: cleanName,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) {
      console.error('Error renaming measurement template:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async addTemplateField(templateId, fieldLabel, fieldUnit = 'inches') {
    if (!isSupabaseConfigured || !templateId || !fieldLabel) return { success: false, error: 'Invalid field data' };

    const label = fieldLabel.trim();
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fieldId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;

    const { data, error } = await supabase
      .from('measurement_template_fields')
      .upsert({
        id: fieldId,
        template_id: templateId,
        field_name: label,
        field_key: key,
        unit: fieldUnit,
        field_type: 'number',
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'template_id, field_key' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async toggleTemplateActive(shopId, templateId, isActive) {
    if (!isSupabaseConfigured) return { success: true };

    const { data, error } = await supabase
      .from('measurement_templates')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async deactivateTemplateField(fieldId) {
    if (!isSupabaseConfigured) return { success: true };

    const { error } = await supabase
      .from('measurement_template_fields')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', fieldId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async deleteTemplate(shopId, templateId) {
    if (!isSupabaseConfigured) return { success: true };

    const { error } = await supabase
      .from('measurement_templates')
      .delete()
      .eq('id', templateId)
      .eq('shop_id', shopId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }
};
