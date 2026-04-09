import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_secret_IsUaKY6lLQP6OSb8bEfKKw_XjzvVjp-";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for backend operations if available to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.get("/api/config", (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co",
      supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_secret_IsUaKY6lLQP6OSb8bEfKKw_XjzvVjp-"
    });
  });

  // Authentication Middleware
  const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith("/api") || req.path === "/api/config") {
      return next();
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization header" });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Invalid token format" });
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.error("Auth error:", error?.message);
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      (req as any).user = user;
      next();
    } catch (err) {
      console.error("Auth middleware exception:", err);
      return res.status(500).json({ error: "Internal server error in auth middleware" });
    }
  };

  // Apply middleware to all subsequent API routes
  app.use(authenticateUser);

  app.get("/api/users", async (req, res) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY missing. Cannot list users.");
      return res.status(501).json({ error: "Service role key not configured on server." });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Error listing users:", error.message);
      return res.status(500).json({ error: error.message });
    }

    // Map to safe user object
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: u.role
    }));

    res.json(safeUsers);
  });

  app.get("/api/periods", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("periods")
      .select("*")
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Supabase error (periods):", error.message);
      return res.json([]);
    }
    res.json(data || []);
  });

  app.post("/api/periods", async (req, res) => {
    const { name } = req.body;
    const user = (req as any).user;
    
    const insertData: any = { 
      name, 
      user_id: user.id
    };
    
    const { data, error } = await supabase.from("periods").insert([insertData]).select().single();
    
    if (error) {
      console.error("Error creating period:", error.message);
      return res.status(500).json(error);
    }
    res.json(data);
  });

  app.put("/api/periods/:id", async (req, res) => {
    const { name } = req.body;
    const user = (req as any).user;
    
    const { error } = await supabase.from("periods").update({ 
      name
    }).eq("id", req.params.id).eq("user_id", user.id);

    if (error) {
      console.error("Error updating period:", error.message);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.delete("/api/periods/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("periods").delete().eq("id", req.params.id).eq("user_id", user.id);

    if (error) {
      console.error("Error deleting period:", error.message);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.get("/api/subjects", async (req, res) => {
    const user = (req as any).user;
    const { data: subjects, error: sError } = await supabase.from("subjects").select("*").eq("user_id", user.id);
    
    if (sError) {
      console.error("Supabase error (subjects):", sError.message);
      return res.json([]);
    }

    // Fetch deadlines from notas_atividades to include in the subject list
    const { data: notas, error: nError } = await supabase.from("notas_atividades").select("mes_materia_id, atividade_1_prazo, atividade_2_prazo, prova_data, atividade_1_inicio, atividade_2_inicio, prova_inicio");
    
    if (nError) {
      console.error("Supabase error (notas for subjects):", nError.message);
      return res.json(subjects || []);
    }

    const notasMap = new Map(notas.map(n => [Number(n.mes_materia_id), n]));
    const subjectsWithDeadlines = (subjects || []).map(s => {
      const nota = notasMap.get(Number(s.id));
      return {
        ...s,
        act1_end: nota?.atividade_1_prazo,
        act2_end: nota?.atividade_2_prazo,
        exam_end: nota?.prova_data,
        act1_start: nota?.atividade_1_inicio,
        act2_start: nota?.atividade_2_inicio,
        exam_start: nota?.prova_inicio
      };
    });

    res.json(subjectsWithDeadlines);
  });

  app.post("/api/subjects", async (req, res) => {
    const { month_year, subject_name, professor, workload, period_id } = req.body;
    const user = (req as any).user;
    
    // Ensure period_id is handled correctly (convert to number if it's a string of digits)
    const pId = (typeof period_id === 'string' && /^\d+$/.test(period_id)) ? parseInt(period_id) : period_id;

    const insertData: any = { 
      month_year, 
      subject_name, 
      professor, 
      workload: workload ? parseInt(workload.toString()) : null, 
      period_id: pId,
      user_id: user.id
    };

    const { data: subject, error: sError } = await supabase.from("subjects")
      .insert([insertData])
      .select().single();
    
    if (sError) {
      console.error("Error creating subject:", sError.message);
      return res.status(500).json(sError);
    }
    
    const subjectId = subject.id;
    // Create linked records in new tables
    try {
      await Promise.all([
        supabase.from("presencas").insert([{ mes_materia_id: subjectId, periodo_id: pId }]),
        supabase.from("notas_atividades").insert([{ mes_materia_id: subjectId, periodo_id: pId }]),
        supabase.from("conteudos_web").insert([{ mes_materia_id: subjectId, periodo_id: pId }])
      ]);
    } catch (err) {
      console.error("Error creating related records:", err);
    }
    
    res.json({ id: subjectId });
  });

  app.put("/api/subjects/:id", async (req, res) => {
    const { month_year, subject_name, professor, workload, period_id } = req.body;
    const user = (req as any).user;
    const pId = (typeof period_id === 'string' && /^\d+$/.test(period_id)) ? parseInt(period_id) : period_id;

    const updateData: any = { 
      month_year, 
      subject_name, 
      professor, 
      workload: workload ? parseInt(workload.toString()) : null, 
      period_id: pId 
    };

    const { error } = await supabase.from("subjects")
      .update(updateData)
      .eq("id", req.params.id)
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Error updating subject:", error.message);
      return res.status(500).json(error);
    }

    // Update periodo_id in related tables too
    try {
      await Promise.all([
        supabase.from("presencas").update({ periodo_id: pId }).eq("mes_materia_id", req.params.id),
        supabase.from("notas_atividades").update({ periodo_id: pId }).eq("mes_materia_id", req.params.id),
        supabase.from("conteudos_web").update({ periodo_id: pId }).eq("mes_materia_id", req.params.id)
      ]);
    } catch (err) {
      console.error("Error updating related records:", err);
    }

    res.json({ success: true });
  });

  app.delete("/api/subjects/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("subjects")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Error deleting subject:", error.message);
      return res.status(500).json(error);
    }
    res.json({ success: true });
  });

  app.get("/api/attendance/:subjectId", async (req, res) => {
    const { data, error } = await supabase.from("presencas").select("*").eq("mes_materia_id", req.params.subjectId).limit(1);
    if (error) return res.status(500).json(error);
    res.json(data && data.length > 0 ? data[0] : {});
  });

  app.put("/api/attendance/:subjectId", async (req, res) => {
    const body = req.body;
    const subjectId = parseInt(req.params.subjectId);
    
    const updateData: any = {};
    const fields = [
      'aula_1', 'aula_2', 'aula_3', 'aula_4', 
      'data_aula_1', 'data_aula_2', 'data_aula_3', 'data_aula_4', 
      'periodo_id'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'periodo_id') {
          updateData[field] = (typeof body[field] === 'string' && /^\d+$/.test(body[field])) ? parseInt(body[field]) : body[field];
        } else {
          updateData[field] = body[field] === '' ? null : body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: "No fields to update" });
    }

    // Try update first
    const { data: updated, error: updateError } = await supabase.from("presencas")
      .update(updateData)
      .eq("mes_materia_id", subjectId)
      .select();

    if (updateError) {
      console.error("Error updating attendance:", updateError.message);
      return res.status(500).json(updateError);
    }

    // If no row updated, insert
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from("presencas").insert([{
        ...updateData,
        mes_materia_id: subjectId
      }]);
      if (insertError) {
        console.error("Error inserting attendance:", insertError.message);
        return res.status(500).json(insertError);
      }
    }
    
    res.json({ success: true });
  });

  app.get("/api/activities/:subjectId", async (req, res) => {
    const { data, error } = await supabase.from("notas_atividades").select("*").eq("mes_materia_id", req.params.subjectId).limit(1);
    if (error) return res.status(500).json(error);
    res.json(data && data.length > 0 ? data[0] : {});
  });

  app.put("/api/activities/:subjectId", async (req, res) => {
    const body = req.body;
    const subjectId = parseInt(req.params.subjectId);
    
    const updateData: any = {};
    const fields = [
      'atividade_1_nota', 'atividade_2_nota', 'prova_nota', 
      'atividade_1_status', 'atividade_2_status', 
      'atividade_1_prazo', 'atividade_2_prazo', 'prova_data', 
      'atividade_1_inicio', 'atividade_2_inicio', 'prova_inicio', 
      'periodo_id'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field.endsWith('_nota')) {
          updateData[field] = (body[field] === '' || body[field] === null) ? null : parseFloat(body[field].toString());
        } else if (field === 'periodo_id') {
          updateData[field] = (typeof body[field] === 'string' && /^\d+$/.test(body[field])) ? parseInt(body[field]) : body[field];
        } else {
          updateData[field] = body[field] === '' ? null : body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: "No fields to update" });
    }

    // Try update first
    const { data: updated, error: updateError } = await supabase.from("notas_atividades")
      .update(updateData)
      .eq("mes_materia_id", subjectId)
      .select();

    if (updateError) {
      console.error("Supabase error (update activities):", updateError.message);
      return res.status(500).json(updateError);
    }

    // If no row updated, insert
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from("notas_atividades").insert([{
        ...updateData,
        mes_materia_id: subjectId
      }]);
      
      if (insertError) {
        console.error("Supabase error (insert activities):", insertError.message);
        return res.status(500).json(insertError);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/web_contents/:subjectId", async (req, res) => {
    const { data, error } = await supabase.from("conteudos_web").select("*").eq("mes_materia_id", req.params.subjectId).limit(1);
    if (error) return res.status(500).json(error);
    res.json(data && data.length > 0 ? data[0] : {});
  });

  app.put("/api/web_contents/:subjectId", async (req, res) => {
    const body = req.body;
    const subjectId = parseInt(req.params.subjectId);
    
    const updateData: any = {};
    const fields = [
      'conteudo_1_assistido', 'conteudo_2_assistido', 'conteudo_3_assistido', 'conteudo_4_assistido', 
      'data_1', 'data_2', 'data_3', 'data_4', 
      'periodo_id'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'periodo_id') {
          updateData[field] = (typeof body[field] === 'string' && /^\d+$/.test(body[field])) ? parseInt(body[field]) : body[field];
        } else {
          updateData[field] = body[field] === '' ? null : body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, message: "No fields to update" });
    }

    // Try update first
    const { data: updated, error: updateError } = await supabase.from("conteudos_web")
      .update(updateData)
      .eq("mes_materia_id", subjectId)
      .select();

    if (updateError) {
      console.error("Error updating web contents:", updateError.message);
      return res.status(500).json(updateError);
    }

    // If no row updated, insert
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase.from("conteudos_web").insert([{
        ...updateData,
        mes_materia_id: subjectId
      }]);
      if (insertError) {
        console.error("Error inserting web contents:", insertError.message);
        return res.status(500).json(insertError);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/dashboard", async (req, res) => {
    try {
      const user = (req as any).user;
      
      const subjectsRes = await supabase.from("subjects").select("id, month_year, subject_name, period_id").eq("user_id", user.id);
      
      if (subjectsRes.error) {
        console.error("Dashboard subjects fetch error:", subjectsRes.error.message);
        throw subjectsRes.error;
      }

      const subjectsData = subjectsRes.data || [];
      const subjectIds = subjectsData.map(s => s.id);

      // Fetch related data only for these subjects
      const [presencasRes, notasRes, webRes] = await Promise.all([
        supabase.from("presencas").select("mes_materia_id, aula_1, aula_2, aula_3, aula_4").in("mes_materia_id", subjectIds),
        supabase.from("notas_atividades").select("mes_materia_id, atividade_1_status, atividade_1_nota, atividade_2_status, atividade_2_nota, prova_nota, atividade_1_prazo, atividade_2_prazo, prova_data, atividade_1_inicio, atividade_2_inicio, prova_inicio").in("mes_materia_id", subjectIds),
        supabase.from("conteudos_web").select("mes_materia_id, conteudo_1_assistido, conteudo_2_assistido, conteudo_3_assistido, conteudo_4_assistido").in("mes_materia_id", subjectIds)
      ]);

      const presencasMap = new Map((presencasRes.data || []).map(p => [Number(p.mes_materia_id), p]));
      const notasMap = new Map((notasRes.data || []).map(n => [Number(n.mes_materia_id), n]));
      const webMap = new Map((webRes.data || []).map(w => [Number(w.mes_materia_id), w]));

      const flattened = subjectsData.map((item: any) => {
        const itemId = Number(item.id);
        const presenca = presencasMap.get(itemId);
        const nota = notasMap.get(itemId);
        const web = webMap.get(itemId);

        return {
          id: item.id,
          month_year: item.month_year,
          subject_name: item.subject_name,
          period_id: item.period_id,
          aula1_present: presenca?.aula_1 ? 1 : 0,
          aula2_present: presenca?.aula_2 ? 1 : 0,
          aula3_present: presenca?.aula_3 ? 1 : 0,
          aula4_present: presenca?.aula_4 ? 1 : 0,
          act1_status: nota?.atividade_1_status || 'Não iniciada',
          act1_grade: nota?.atividade_1_nota,
          act2_status: nota?.atividade_2_status || 'Não iniciada',
          act2_grade: nota?.atividade_2_nota,
          exam_grade: nota?.prova_nota,
          c1_watched: web?.conteudo_1_assistido ? 1 : 0,
          c2_watched: web?.conteudo_2_assistido ? 1 : 0,
          c3_watched: web?.conteudo_3_assistido ? 1 : 0,
          c4_watched: web?.conteudo_4_assistido ? 1 : 0,
          act1_deadline: nota?.atividade_1_prazo,
          act2_deadline: nota?.atividade_2_prazo,
          exam_date: nota?.prova_data,
          act1_start: nota?.atividade_1_inicio,
          act2_start: nota?.atividade_2_inicio,
          exam_start: nota?.prova_inicio
        };
      });

      res.json(flattened);
    } catch (error: any) {
      console.error("Dashboard error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- System Setup ---
  app.post("/api/setup-finance", async (req, res) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res.status(500).json({ error: "Service role key missing" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // SQL to create tables if they don't exist
    // Note: Supabase JS client doesn't support raw SQL execution directly via `rpc` unless a function is created.
    // However, we can check if tables exist by trying to select from them.
    // If they error, we can inform the user to run the migration script.
    
    // Ideally, we would use a migration tool or raw SQL execution if available.
    // Since we are limited, we will just check and return status.
    
    const tables = ["financial_categories", "financial_accounts", "financial_transactions", "financial_responsibles", "clients", "client_sales", "client_installments", "chacara_users", "chacara_bills", "chacara_settings"];
    const status: Record<string, boolean> = {};

    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).select("id").limit(1);
      status[table] = !error;
    }

    res.json({ 
      success: true, 
      tables: status,
      message: "Verificação concluída. Se alguma tabela estiver faltando (false), por favor execute o script SQL no painel do Supabase." 
    });
  });

  // --- Financial Module Routes ---

  // Categories
  app.get("/api/finance/categories", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("financial_categories").select("*").eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/finance/categories", async (req, res) => {
    const user = (req as any).user;
    const { name, type } = req.body;
    const { data, error } = await supabase.from("financial_categories").insert([{ name, type, user_id: user.id }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.put("/api/finance/categories/:id", async (req, res) => {
    const user = (req as any).user;
    const { name, type } = req.body;
    const { error } = await supabase.from("financial_categories").update({ name, type }).eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/finance/categories/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("financial_categories").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Accounts
  app.get("/api/finance/accounts", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("financial_accounts").select("*").eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/finance/accounts", async (req, res) => {
    const user = (req as any).user;
    const { name, initial_balance, type, closing_day, due_day } = req.body;
    const { data, error } = await supabase.from("financial_accounts").insert([{ 
      name, 
      initial_balance, 
      type, 
      closing_day, 
      due_day, 
      user_id: user.id 
    }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.put("/api/finance/accounts/:id", async (req, res) => {
    const user = (req as any).user;
    const { name, initial_balance, type, closing_day, due_day } = req.body;
    const { error } = await supabase.from("financial_accounts").update({ 
      name, 
      initial_balance, 
      type, 
      closing_day, 
      due_day 
    }).eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/finance/accounts/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("financial_accounts").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Responsibles
  app.get("/api/finance/responsibles", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("financial_responsibles").select("*").eq("user_id", user.id).order('name');
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/finance/responsibles", async (req, res) => {
    const user = (req as any).user;
    const { name } = req.body;
    const { data, error } = await supabase.from("financial_responsibles").insert([{ name, user_id: user.id }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.delete("/api/finance/responsibles/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("financial_responsibles").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Transactions
  app.get("/api/finance/transactions", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("financial_transactions")
      .select(`
        *,
        financial_categories (name),
        financial_accounts (name)
      `)
      .eq("user_id", user.id)
      .order('date', { ascending: false });
    
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/finance/transactions", async (req, res) => {
    const user = (req as any).user;
    const { 
      description, amount, type, category_id, account_id, date, status,
      is_installment, total_installments, splits 
    } = req.body;

    const catId = category_id === '' ? null : category_id;
    const accId = account_id === '' ? null : account_id;

    if (is_installment && total_installments > 1) {
      const installments = [];
      const startDate = new Date(date);
      const installmentAmount = Number((amount / total_installments).toFixed(2));
      
      // Calculate split amounts for installments
      const installmentSplits = (splits || []).map((s: any) => ({
        ...s,
        amount: Number((s.amount / total_installments).toFixed(2))
      }));
      
      // Create the first installment to get its ID
      const { data: firstInstallment, error: firstError } = await supabase.from("financial_transactions").insert([{
        description, 
        amount: installmentAmount, 
        type, 
        category_id: catId, 
        account_id: accId, 
        date, 
        status, 
        user_id: user.id,
        is_installment: true,
        installment_number: 1,
        total_installments,
        splits: installmentSplits
      }]).select().single();

      if (firstError) return res.status(500).json(firstError);

      // Create subsequent installments
      for (let i = 2; i <= total_installments; i++) {
        const nextDate = new Date(startDate);
        nextDate.setMonth(startDate.getMonth() + (i - 1));
        
        installments.push({
          description,
          amount: installmentAmount,
          type,
          category_id: catId,
          account_id: accId,
          date: nextDate.toISOString().split('T')[0],
          status: 'pendente', // Subsequent installments are usually pending
          user_id: user.id,
          is_installment: true,
          installment_number: i,
          total_installments,
          parent_transaction_id: firstInstallment.id,
          splits: installmentSplits
        });
      }

      if (installments.length > 0) {
        const { error: bulkError } = await supabase.from("financial_transactions").insert(installments);
        if (bulkError) return res.status(500).json(bulkError);
      }

      return res.json(firstInstallment);
    } else {
      const { data, error } = await supabase.from("financial_transactions").insert([{
        description, amount, type, category_id: catId, account_id: accId, date, status, user_id: user.id,
        splits: splits || []
      }]).select().single();
      if (error) return res.status(500).json(error);
      res.json(data);
    }
  });

  app.put("/api/finance/transactions/:id", async (req, res) => {
    const user = (req as any).user;
    const updateData: any = {};
    
    // Only update fields that are actually provided in the request body
    const fields = ['description', 'amount', 'type', 'category_id', 'account_id', 'date', 'status', 'splits', 'is_installment', 'installment_number', 'total_installments'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if ((field === 'category_id' || field === 'account_id') && req.body[field] === '') {
          updateData[field] = null;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    const { error } = await supabase.from("financial_transactions")
      .update(updateData)
      .eq("id", req.params.id)
      .eq("user_id", user.id);
      
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/finance/transactions/:id", async (req, res) => {
    const user = (req as any).user;
    const id = req.params.id;

    // First fetch the transaction to check if it's an installment
    const { data: transaction, error: fetchError } = await supabase
      .from("financial_transactions")
      .select("id, is_installment, parent_transaction_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) return res.status(500).json(fetchError);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    let idToDelete = id;
    
    // If it's a child installment, delete the parent (which cascades to all children)
    if (transaction.is_installment && transaction.parent_transaction_id) {
      idToDelete = transaction.parent_transaction_id;
    }
    // If it's a parent installment (no parent_id but is_installment is true), delete it directly (cascades to children)
    
    const { error } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("id", idToDelete)
      .eq("user_id", user.id);

    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Dashboard Summary
  app.get("/api/finance/dashboard", async (req, res) => {
    try {
      const user = (req as any).user;
      const { month, year } = req.query;
      
      // Get all transactions
      const { data: transactions, error: tError } = await supabase.from("financial_transactions").select("*").eq("user_id", user.id);
      if (tError) return res.status(500).json(tError);

      // Get all accounts (for initial balance)
      const { data: accounts, error: aError } = await supabase.from("financial_accounts").select("*").eq("user_id", user.id);
      if (aError) return res.status(500).json(aError);

      // Calculate totals
      let initialBalance = 0;
      const accountMap: Record<string, string> = {};
      if (accounts) {
        accounts.forEach(acc => {
          accountMap[String(acc.id)] = acc.type;
          if (acc.type !== 'credito') {
            initialBalance += Number(acc.initial_balance || 0);
          }
        });
      }

      let totalIncome = 0;
      let totalExpense = 0;
      let cashIncome = 0;
      let cashExpense = 0;
      let monthIncome = 0;
      let monthExpense = 0;
      let previousBalance = initialBalance;

      const now = new Date();
      const filterMonth = month ? Number(month) : now.getMonth();
      const filterYear = year ? Number(year) : now.getFullYear();

      const responsibilitySummary: Record<string, number> = {};
      const accountsSummary: Record<string, { id: string, name: string, type: string, balance: number, responsibles: Record<string, number> }> = {};

      if (accounts) {
        accounts.forEach(acc => {
          accountsSummary[String(acc.id)] = {
            id: String(acc.id),
            name: acc.name,
            type: acc.type,
            balance: Number(acc.initial_balance || 0),
            responsibles: {}
          };
        });
      }

      if (transactions) {
        transactions.forEach(t => {
          if (!t.date) return; // Skip if no date
          
          const amount = Number(t.amount || 0);
          const accType = accountMap[String(t.account_id)];
          const account = accounts?.find(a => String(a.id) === String(t.account_id));
          
          // Update account balance
          if (accountsSummary[String(t.account_id)]) {
            if (t.type === 'receita') {
              accountsSummary[String(t.account_id)].balance += amount;
            } else {
              if (!t.is_installment) {
                accountsSummary[String(t.account_id)].balance -= amount;
              }
            }
          }
          
          // 1. Global Balances (Total and Cash)
          if (t.type === 'receita') {
            totalIncome += amount;
            if (accType !== 'credito') cashIncome += amount;
          } else {
            // Exclude installments entirely from main expenses as they are tracked in Credit Management
            if (t.is_installment) {
              // Skip
            } else {
              totalExpense += amount;
              if (accType !== 'credito') cashExpense += amount;
            }
          }

          // 2. Monthly Dashboard Logic (Aligned with Invoices)
          let belongsToMonth = false;
          let isBeforeMonth = false;
          
          const dateStr = t.date.split('T')[0];
          
          if (accType === 'credito') {
            const closingDay = account?.closing_day || 1;
            const [y, m, d] = dateStr.split('-').map(Number);
            const tDate = new Date(y, m - 1, d);
            
            const invoiceEnd = new Date(filterYear, filterMonth, closingDay);
            const invoiceStart = new Date(filterYear, filterMonth - 1, closingDay + 1);
            
            if (tDate >= invoiceStart && tDate <= invoiceEnd) {
              belongsToMonth = true;
            } else if (tDate < invoiceStart) {
              isBeforeMonth = true;
            }
          } else {
            const [tYear, tMonth] = dateStr.split('-').map(Number);
            if (tYear === filterYear && tMonth - 1 === filterMonth) {
              belongsToMonth = true;
            } else if (tYear < filterYear || (tYear === filterYear && tMonth - 1 < filterMonth)) {
              isBeforeMonth = true;
            }
          }

          // Add to previous balance if it's before the filtered month
          if (isBeforeMonth) {
            if (t.type === 'receita') {
              previousBalance += amount;
            } else {
              if (!t.is_installment) {
                previousBalance -= amount;
              }
            }
          }

          if (belongsToMonth) {
            if (t.type === 'receita') {
              monthIncome += amount;
            } else {
              if (t.is_installment) {
                // Skip
              } else {
                monthExpense += amount;
              }
            }

            // Add to responsibility summary for expenses
            if (t.type === 'despesa' && t.splits && Array.isArray(t.splits)) {
              t.splits.forEach((s: any) => {
                // Only include pending splits in the responsibility summary
                if (s.status !== 'pago') {
                  const name = s.name || 'Outros';
                  const sAmount = Number(s.amount || 0);
                  responsibilitySummary[name] = (responsibilitySummary[name] || 0) + sAmount;
                  
                  if (accountsSummary[String(t.account_id)]) {
                    accountsSummary[String(t.account_id)].responsibles[name] = (accountsSummary[String(t.account_id)].responsibles[name] || 0) + sAmount;
                  }
                }
              });
            }
          }
        });
      }

      const totalBalance = initialBalance + totalIncome - totalExpense;
      const cashBalance = initialBalance + cashIncome - cashExpense;

      res.json({ 
        total_balance: totalBalance,
        cash_balance: cashBalance,
        month_income: monthIncome,
        month_expense: monthExpense,
        previous_balance: previousBalance,
        responsibility_summary: responsibilitySummary,
        accounts_summary: Object.values(accountsSummary),
        transactions, 
        accounts 
      });
    } catch (error: any) {
      console.error("Error in /api/finance/dashboard:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // --- Client Module Routes ---

  // Clients
  app.get("/api/clients", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("clients")
      .select(`
        *,
        client_sales (purchase_date)
      `)
      .eq("user_id", user.id)
      .order('name');
    
    if (error) return res.status(500).json(error);
    
    // Process data to find the most recent purchase date for each client
    const processedData = (data || []).map((client: any) => {
      const sales = client.client_sales || [];
      const lastPurchase = sales.length > 0 
        ? sales.reduce((latest: string, current: any) => 
            current.purchase_date > latest ? current.purchase_date : latest, 
          sales[0].purchase_date)
        : null;
      
      const { client_sales, ...clientData } = client;
      return { ...clientData, last_purchase: lastPurchase };
    });

    res.json(processedData);
  });

  app.post("/api/clients", async (req, res) => {
    const user = (req as any).user;
    const { name, phone } = req.body;
    const { data, error } = await supabase.from("clients").insert([{ name, phone, user_id: user.id }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.put("/api/clients/:id", async (req, res) => {
    const user = (req as any).user;
    const { name, phone } = req.body;
    const { error } = await supabase.from("clients").update({ name, phone }).eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/clients/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("clients").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Client Sales
  app.get("/api/client-sales", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("client_sales")
      .select(`
        *,
        clients (name)
      `)
      .eq("user_id", user.id)
      .order('purchase_date', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/client-sales", async (req, res) => {
    const user = (req as any).user;
    const { client_id, description, total_amount, installment_count, purchase_date, due_day } = req.body;
    
    // 1. Create Sale
    const { data: sale, error: saleError } = await supabase.from("client_sales").insert([{
      client_id,
      description,
      total_amount,
      installment_count,
      purchase_date,
      due_day,
      user_id: user.id
    }]).select().single();

    if (saleError) return res.status(500).json(saleError);

    // 2. Generate Installments
    const installments = [];
    const installmentAmount = Number((total_amount / installment_count).toFixed(2));
    const purchaseDateObj = new Date(purchase_date);
    
    for (let i = 1; i <= installment_count; i++) {
      // Calculate due date: next month on due_day
      const dueDate = new Date(purchaseDateObj.getFullYear(), purchaseDateObj.getMonth() + i, due_day);
      
      installments.push({
        sale_id: sale.id,
        installment_number: i,
        amount: installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pendente',
        user_id: user.id
      });
    }

    const { error: instError } = await supabase.from("client_installments").insert(installments);
    if (instError) {
      console.error("Error creating installments:", instError);
      // Ideally rollback sale here, but for simplicity we'll just log
    }

    res.json(sale);
  });

  app.delete("/api/client-sales/:id", async (req, res) => {
    const user = (req as any).user;
    // Cascade delete handles installments
    const { error } = await supabase.from("client_sales").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Client Installments (Dashboard)
  app.get("/api/client-installments", async (req, res) => {
    const user = (req as any).user;
    const { month, year, client_id } = req.query;

    let query = supabase.from("client_installments")
      .select(`
        *,
        client_sales (
          description,
          installment_count,
          clients (name, phone)
        )
      `)
      .eq("user_id", user.id)
      .order('due_date');

    if (month && year) {
      const startDate = new Date(Number(year), Number(month), 1).toISOString().split('T')[0];
      const endDate = new Date(Number(year), Number(month) + 1, 0).toISOString().split('T')[0];
      query = query.gte('due_date', startDate).lte('due_date', endDate);
    }

    if (client_id) {
      // Filter by client requires join filtering, which is tricky in simple query.
      // Easier to filter in memory or use a more complex query.
      // For now, let's filter in memory if needed or rely on frontend.
    }

    const { data, error } = await query;
    if (error) return res.status(500).json(error);
    
    // Filter by client_id in memory if provided (since it's nested)
    let filteredData = data || [];
    if (client_id) {
      filteredData = filteredData.filter((item: any) => item.client_sales?.client_id === Number(client_id));
    }

    res.json(filteredData);
  });

  app.put("/api/client-installments/:id", async (req, res) => {
    const user = (req as any).user;
    const { status, payment_date, amount, due_date } = req.body;
    
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (payment_date !== undefined) updateData.payment_date = payment_date;
    if (amount !== undefined) updateData.amount = amount;
    if (due_date !== undefined) updateData.due_date = due_date;

    const { error } = await supabase.from("client_installments")
      .update(updateData)
      .eq("id", req.params.id)
      .eq("user_id", user.id);
      
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/client-installments/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("client_installments")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // --- Chácara Module Routes ---
  app.get("/api/chacara/users", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("chacara_users").select("*").eq("user_id", user.id).order('name');
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/chacara/users", async (req, res) => {
    const user = (req as any).user;
    const { name, phone, has_energy, has_water, energy_meters_count, water_meters_count, energy_active, water_active } = req.body;
    const { data, error } = await supabase.from("chacara_users").insert([{ 
      name, 
      phone, 
      user_id: user.id,
      has_energy: has_energy !== undefined ? has_energy : true,
      has_water: has_water !== undefined ? has_water : true,
      energy_meters_count: energy_meters_count || 1,
      water_meters_count: water_meters_count || 1,
      energy_active: energy_active !== undefined ? energy_active : true,
      water_active: water_active !== undefined ? water_active : true
    }]).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.put("/api/chacara/users/:id", async (req, res) => {
    const user = (req as any).user;
    const { name, phone, has_energy, has_water, energy_meters_count, water_meters_count, energy_active, water_active } = req.body;
    const { error } = await supabase.from("chacara_users").update({ 
      name, 
      phone,
      has_energy,
      has_water,
      energy_meters_count: energy_meters_count || 1,
      water_meters_count: water_meters_count || 1,
      energy_active: energy_active !== undefined ? energy_active : true,
      water_active: water_active !== undefined ? water_active : true
    }).eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.delete("/api/chacara/users/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("chacara_users").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.get("/api/chacara/bills", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("chacara_bills").select("*").eq("user_id", user.id).order('created_at', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data || []);
  });

  app.post("/api/chacara/bills", async (req, res) => {
    const user = (req as any).user;
    const { 
      chacara_user_id, month_reference, reading_date, due_date, 
      prev_reading, curr_reading, prev_reading_2, curr_reading_2, kwh_value, 
      water_prev_reading, water_curr_reading, water_prev_reading_2, water_curr_reading_2, water_value, water_service_fee,
      apportionment_value, include_apportionment,
      reserve_fund, total, include_reserve_fund, status, payment_date, amount_paid,
      energy_readings, water_readings, paid_categories
    } = req.body;
    
    // 1. Create Bill
    const { data: bill, error: billError } = await supabase.from("chacara_bills").insert([{
      chacara_user_id,
      month_reference,
      reading_date,
      due_date,
      prev_reading,
      curr_reading,
      prev_reading_2: prev_reading_2 || 0,
      curr_reading_2: curr_reading_2 || 0,
      kwh_value,
      water_prev_reading,
      water_curr_reading,
      water_prev_reading_2: water_prev_reading_2 || 0,
      water_curr_reading_2: water_curr_reading_2 || 0,
      water_value,
      water_service_fee: water_service_fee || 0,
      apportionment_value,
      include_apportionment,
      reserve_fund,
      total,
      include_reserve_fund,
      status: status || 'pending',
      payment_date: payment_date || null,
      amount_paid: amount_paid || 0,
      user_id: user.id,
      energy_readings: energy_readings || [],
      water_readings: water_readings || [],
      paid_categories: paid_categories || {}
    }]).select().single();

    if (billError) return res.status(500).json(billError);

    // 2. Update User's last readings
    await supabase.from("chacara_users").update({ 
      last_reading: curr_reading,
      last_reading_2: curr_reading_2 || 0,
      last_water_reading: water_curr_reading,
      last_water_reading_2: water_curr_reading_2 || 0,
      energy_readings: energy_readings || [],
      water_readings: water_readings || []
    }).eq("id", chacara_user_id).eq("user_id", user.id);

    res.json(bill);
  });

  app.put("/api/chacara/bills/:id", async (req, res) => {
    const user = (req as any).user;
    const { 
      chacara_user_id, month_reference, reading_date, due_date, 
      prev_reading, curr_reading, prev_reading_2, curr_reading_2, kwh_value, 
      water_prev_reading, water_curr_reading, water_prev_reading_2, water_curr_reading_2, water_value, water_service_fee,
      apportionment_value, include_apportionment,
      reserve_fund, total, include_reserve_fund, status, payment_date, amount_paid,
      energy_readings, water_readings, paid_categories
    } = req.body;
    
    const { error } = await supabase.from("chacara_bills").update({
      chacara_user_id,
      month_reference,
      reading_date,
      due_date,
      prev_reading,
      curr_reading,
      prev_reading_2: prev_reading_2 || 0,
      curr_reading_2: curr_reading_2 || 0,
      kwh_value,
      water_prev_reading,
      water_curr_reading,
      water_prev_reading_2: water_prev_reading_2 || 0,
      water_curr_reading_2: water_curr_reading_2 || 0,
      water_value,
      water_service_fee: water_service_fee || 0,
      apportionment_value,
      include_apportionment,
      reserve_fund,
      total,
      include_reserve_fund,
      status,
      payment_date: payment_date || null,
      amount_paid: amount_paid || 0,
      energy_readings: energy_readings || [],
      water_readings: water_readings || [],
      paid_categories: paid_categories || {}
    }).eq("id", req.params.id).eq("user_id", user.id);

    if (error) return res.status(500).json(error);
    
    // Update User's last readings
    await supabase.from("chacara_users").update({ 
      last_reading: curr_reading,
      last_reading_2: curr_reading_2 || 0,
      last_water_reading: water_curr_reading,
      last_water_reading_2: water_curr_reading_2 || 0,
      energy_readings: energy_readings || [],
      water_readings: water_readings || []
    }).eq("id", chacara_user_id).eq("user_id", user.id);

    res.json({ success: true });
  });

  app.delete("/api/chacara/bills/:id", async (req, res) => {
    const user = (req as any).user;
    const { error } = await supabase.from("chacara_bills").delete().eq("id", req.params.id).eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  app.get("/api/chacara/settings", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("chacara_settings").select("*").eq("user_id", user.id).limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_settings' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(error);
    }
    
    res.json(data?.[0] || null);
  });

  app.put("/api/chacara/settings", async (req, res) => {
    const user = (req as any).user;
    const { 
      default_kwh, default_water_value, default_water_service_fee, default_apportionment_value, 
      default_due_day, default_reading_day, reserve_fund_value, default_month_reference,
      whatsapp_observation
    } = req.body;
    
    const { data: existings, error: checkError } = await supabase.from("chacara_settings").select("id").eq("user_id", user.id).limit(1);
    
    if (checkError) {
      if (checkError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_settings' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(checkError);
    }
    
    const existing = existings?.[0];
    
    let error;
    if (existing) {
      const res = await supabase.from("chacara_settings").update({
        default_kwh, default_water_value, default_water_service_fee, default_apportionment_value, 
        default_due_day, default_reading_day, reserve_fund_value, default_month_reference,
        whatsapp_observation
      }).eq("user_id", user.id);
      error = res.error;
    } else {
      const res = await supabase.from("chacara_settings").insert([{
        user_id: user.id, default_kwh, default_water_value, default_water_service_fee, default_apportionment_value, 
        default_due_day, default_reading_day, reserve_fund_value, default_month_reference,
        whatsapp_observation
      }]);
      error = res.error;
    }

    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // --- Accountability Endpoints ---
  app.get("/api/chacara/accountability/:month", async (req, res) => {
    const user = (req as any).user;
    const { month } = req.params; // YYYY-MM
    
    // 1. Get manually saved accountability data
    const { data: accs, error: accError } = await supabase
      .from("chacara_accountability")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_reference", month)
      .limit(1);
      
    if (accError) {
      if (accError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(accError);
    }
    
    const accountability = accs?.[0] || null;
    
    // 2. Calculate automatic collections from chacara_bills
    // Bills are paid in a specific month. We need to sum payments for this month.
    // The user wants: total, reserve_fund, energy, water, taxa_chacara
    
    const { data: bills, error: billsError } = await supabase
      .from("chacara_bills")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["paid", "partial"])
      .gte("payment_date", `${month}-01`)
      .lte("payment_date", `${month}-31`);

    if (billsError) {
      console.error("Error fetching bills for accountability:", billsError);
      return res.status(500).json(billsError);
    }

    let total_collected = 0;
    let collected_reserve_fund = 0;
    let collected_energy = 0;
    let collected_water = 0;
    let collected_taxa_chacara = 0;

    if (bills) {
      bills.forEach(bill => {
        const isPaid = bill.status === 'paid';
        const amountPaid = isPaid ? bill.total : (bill.amount_paid || 0);
        const ratio = bill.total > 0 ? amountPaid / bill.total : 0;
        
        total_collected += amountPaid;

        const fundoReserva = bill.include_reserve_fund ? (bill.reserve_fund || 0) : 0;
        const rateio = bill.include_apportionment ? (bill.apportionment_value || 0) : 0;
        const prestador = bill.water_service_fee || 0;

        const energyReadings = bill.energy_readings || [];
        const waterReadings = bill.water_readings || [];

        const energyConsumption = energyReadings.length > 0
          ? energyReadings.reduce((acc: number, r: any) => acc + (r.curr - r.prev), 0)
          : (bill.curr_reading - bill.prev_reading) + ((bill.curr_reading_2 || 0) - (bill.prev_reading_2 || 0));
        const energia = energyConsumption * bill.kwh_value;
        
        const waterConsumption = waterReadings.length > 0
          ? waterReadings.reduce((acc: number, r: any) => acc + (r.curr - r.prev), 0)
          : (bill.water_curr_reading || 0) - (bill.water_prev_reading || 0) + ((bill.water_curr_reading_2 || 0) - (bill.water_prev_reading_2 || 0));
        const agua = waterConsumption * (bill.water_value || 0);

        const hasPaidCategories = bill.paid_categories && Object.keys(bill.paid_categories).length > 0;
        
        const getReceived = (value: number, key: string) => {
          if (hasPaidCategories) {
            return bill.paid_categories[key] ? value : 0;
          }
          return value * ratio;
        };

        collected_reserve_fund += getReceived(fundoReserva, 'reserve_fund');
        collected_energy += getReceived(energia, 'energy_total');
        collected_water += getReceived(agua, 'water_total');
        collected_taxa_chacara += getReceived(prestador, 'water_service_fee') + getReceived(rateio, 'apportionment');
      });
    }
    
    res.json({
      ...(accountability || { month_reference: month, user_id: user.id }),
      total_collected,
      collected_reserve_fund,
      collected_energy,
      collected_water,
      collected_taxa_chacara
    });
  });

  app.post("/api/chacara/accountability", async (req, res) => {
    const user = (req as any).user;
    const { 
      month_reference, prev_balance_reserve_fund, prev_balance_main_account,
      prev_balance_services, prev_balance_energy, prev_balance_water,
      total_collected, closing_date
    } = req.body;
    
    // Check if exists
    const { data: existings, error: checkError } = await supabase
      .from("chacara_accountability")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_reference", month_reference)
      .limit(1);
      
    if (checkError) {
      if (checkError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(checkError);
    }
    
    const existing = existings?.[0];

    let result;
    if (existing) {
      result = await supabase.from("chacara_accountability").update({
        prev_balance_reserve_fund: prev_balance_reserve_fund || 0,
        prev_balance_main_account: prev_balance_main_account || 0,
        prev_balance_services: prev_balance_services || 0,
        prev_balance_energy: prev_balance_energy || 0,
        prev_balance_water: prev_balance_water || 0,
        total_collected: total_collected || 0,
        closing_date: closing_date || null
      }).eq("id", existing.id).select().single();
    } else {
      result = await supabase.from("chacara_accountability").insert([{
        user_id: user.id,
        month_reference,
        prev_balance_reserve_fund: prev_balance_reserve_fund || 0,
        prev_balance_main_account: prev_balance_main_account || 0,
        prev_balance_services: prev_balance_services || 0,
        prev_balance_energy: prev_balance_energy || 0,
        prev_balance_water: prev_balance_water || 0,
        total_collected: total_collected || 0,
        closing_date: closing_date || null
      }]).select().single();
    }
    
    if (result.error) return res.status(500).json(result.error);
    res.json(result.data);
  });

  app.get("/api/chacara/expenses", async (req, res) => {
    const user = (req as any).user;
    
    const { data: accs, error: accsError } = await supabase.from("chacara_accountability").select("id, month_reference").eq("user_id", user.id);
    
    if (accsError) {
      if (accsError.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(accsError);
    }
    
    if (!accs || accs.length === 0) return res.json([]);
    
    const accIds = accs.map(a => a.id);
    const { data: expenses, error } = await supabase.from("chacara_expenses").select("*").in("accountability_id", accIds).order('date', { ascending: false });
    
    if (error) {
      if (error.code === '42P01') {
        return res.status(500).json({ error: "A tabela 'chacara_expenses' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
      }
      return res.status(500).json(error);
    }
    
    const mapped = expenses?.map(e => {
      const acc = accs.find(a => a.id === e.accountability_id);
      return { ...e, month_reference: acc?.month_reference };
    }) || [];
    
    res.json(mapped);
  });

  app.post("/api/chacara/expenses", async (req, res) => {
    const user = (req as any).user;
    const { month_reference, description, category, amount, date, receipt_url } = req.body;
    
    if (!month_reference || !description || amount === undefined) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    try {
      let { data: accs, error: accError } = await supabase
        .from("chacara_accountability")
        .select("id")
        .eq("user_id", user.id)
        .eq("month_reference", month_reference)
        .limit(1);
      
      let acc = accs?.[0];

      if (accError) {
        console.error("Error fetching accountability:", accError);
        if (accError.code === '42P01') {
          return res.status(500).json({ error: "A tabela 'chacara_accountability' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
        }
        return res.status(500).json({ error: accError.message || JSON.stringify(accError) });
      }
      
      if (!acc) {
        const { data: newAcc, error: createError } = await supabase
          .from("chacara_accountability")
          .insert([{ user_id: user.id, month_reference }])
          .select("id")
          .single();
          
        if (createError) {
          console.error("Error creating accountability:", createError);
          return res.status(500).json(createError);
        }
        acc = newAcc;
      }
      
      const { data, error } = await supabase.from("chacara_expenses").insert([{
        accountability_id: acc.id,
        description,
        category,
        amount: Number(amount),
        date,
        receipt_url
      }]).select().single();
      
      if (error) {
        console.error("Error inserting expense:", JSON.stringify(error, null, 2));
        if (error.code === '42P01') {
          return res.status(500).json({ error: "A tabela 'chacara_expenses' não existe no banco de dados. Por favor, execute o script SQL no Supabase." });
        }
        return res.status(500).json(error);
      }
      
      res.json({ ...data, month_reference });
    } catch (err: any) {
      console.error("Unexpected error saving expense:", err);
      res.status(500).json({ error: err.message || "Erro interno do servidor" });
    }
  });

  app.delete("/api/chacara/expenses/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    const { data: expense } = await supabase.from("chacara_expenses").select("accountability_id").eq("id", id).single();
    if (expense) {
       const { data: acc } = await supabase.from("chacara_accountability").select("user_id").eq("id", expense.accountability_id).single();
       if (acc && acc.user_id === user.id) {
          const { error } = await supabase.from("chacara_expenses").delete().eq("id", id);
          if (error) return res.status(500).json(error);
          return res.json({ success: true });
       }
    }
    res.status(403).json({ error: "Unauthorized" });
  });

  app.put("/api/chacara/expenses/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { month_reference, description, category, amount, date, receipt_url } = req.body;
    
    try {
      const { data: expense } = await supabase.from("chacara_expenses").select("accountability_id").eq("id", id).single();
      if (!expense) return res.status(404).json({ error: "Expense not found" });
      
      const { data: acc } = await supabase.from("chacara_accountability").select("user_id").eq("id", expense.accountability_id).single();
      if (!acc || acc.user_id !== user.id) return res.status(403).json({ error: "Unauthorized" });

      // If month_reference changed, we need to update accountability_id
      let newAccId = expense.accountability_id;
      const { data: currentAcc } = await supabase.from("chacara_accountability").select("month_reference").eq("id", expense.accountability_id).single();
      
      if (currentAcc && currentAcc.month_reference !== month_reference) {
        let { data: newAcc } = await supabase.from("chacara_accountability").select("id").eq("user_id", user.id).eq("month_reference", month_reference).single();
        if (!newAcc) {
          const { data: createdAcc, error: createError } = await supabase.from("chacara_accountability").insert([{ user_id: user.id, month_reference }]).select().single();
          if (createError) return res.status(500).json(createError);
          newAcc = createdAcc;
        }
        newAccId = newAcc.id;
      }

      const { data, error } = await supabase.from("chacara_expenses").update({
        accountability_id: newAccId,
        description,
        category,
        amount: Number(amount),
        date,
        receipt_url
      }).eq("id", id).select().single();
      
      if (error) return res.status(500).json(error);
      res.json({ ...data, month_reference });
    } catch (err: any) {
      console.error("Unexpected error updating expense:", err);
      res.status(500).json({ error: err.message || "Erro interno do servidor" });
    }
  });

  // Personal Tasks
  app.get("/api/personal/tasks", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase
      .from("personal_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.post("/api/personal/tasks", async (req, res) => {
    const user = (req as any).user;
    const { title, description, due_date, priority, status, eisenhower_quadrant } = req.body;
    const { data, error } = await supabase
      .from("personal_tasks")
      .insert([{ user_id: user.id, title, description, due_date, priority, status, eisenhower_quadrant }])
      .select()
      .single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.put("/api/personal/tasks/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { title, description, due_date, priority, status, eisenhower_quadrant } = req.body;
    const { data, error } = await supabase
      .from("personal_tasks")
      .update({ title, description, due_date, priority, status, eisenhower_quadrant })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return res.status(500).json(error);
    res.json(data);
  });

  app.delete("/api/personal/tasks/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { error } = await supabase
      .from("personal_tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

  // Catch-all for API routes to prevent falling through to Vite SPA
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Export the Express app for Vercel Serverless Functions
  export default app;

  // Only run the server locally (not on Vercel)
  if (!process.env.VERCEL) {
    async function startLocalServer() {
      const PORT = process.env.PORT || 3000;
      
      // Vite middleware for development
      if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
          server: { 
            middlewareMode: true,
            hmr: process.env.DISABLE_HMR === 'true' ? false : undefined
          },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        app.use(express.static(path.join(__dirname, "dist")));
        app.get("*", (req, res) => {
          res.sendFile(path.join(__dirname, "dist", "index.html"));
        });
      }

      app.listen(Number(PORT), "0.0.0.0", async () => {
        console.log(`Server running on http://localhost:${PORT}`);
        
        // Test Supabase connection and tables
        const tables = ["periods", "subjects", "presencas", "notas_atividades", "conteudos_web"];
        console.log("\n🔍 Verificando tabelas no Supabase...");
        
        for (const table of tables) {
          const { error } = await supabase.from(table).select("id").limit(1);
          if (error) {
            console.error(`❌ Erro na tabela [${table}]:`, error.message);
          } else {
            console.log(`✅ Tabela [${table}] detectada com sucesso.`);
          }
        }
        
        console.log("\n💡 DICA: Se alguma tabela acima falhou, execute o script SQL no painel do Supabase.\n");
      });
    }
    
    startLocalServer();
  }
