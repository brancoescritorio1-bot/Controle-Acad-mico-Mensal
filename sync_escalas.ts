import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const urlRaw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co";
const url = urlRaw.split('/rest/v1/')[0].replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key || "");

async function sync() {
  console.log("Starting scale template synchronization...");
  
  // 1. Fetch all templates
  const { data: templates, error: templatesError } = await supabase.from('email_templates').select('*');
  if (templatesError) {
    console.error("Error fetching templates:", templatesError);
    return;
  }
  console.log(`Found ${templates?.length || 0} templates.`);

  // 2. Fetch all scales with a template_id
  const { data: escalas, error: escalasError } = await supabase.from('escalas').select('*').not('template_id', 'is', null);
  if (escalasError) {
    console.error("Error fetching scales:", escalasError);
    return;
  }
  console.log(`Found ${escalas?.length || 0} scales linked to a template.`);

  if (!escalas || escalas.length === 0) {
    console.log("No scales to update.");
    return;
  }

  // 3. Update each scale
  for (const escala of escalas) {
    const template = templates?.find(t => t.id === escala.template_id);
    if (template) {
      console.log(`Updating scale "${escala.name}" with template "${template.name}"...`);
      const { error: updateError } = await supabase
        .from('escalas')
        .update({
          email_subject_template: template.subject_template || '',
          email_body_template: template.body_template || ''
        })
        .eq('id', escala.id);
        
      if (updateError) {
        console.error(`Failed to update scale ${escala.id}:`, updateError);
      } else {
        console.log(`Successfully updated scale "${escala.name}".`);
      }
    } else {
      console.log(`No matching template found for template_id: ${escala.template_id} on scale "${escala.name}".`);
    }
  }
  console.log("Synchronization complete!");
}

sync();
