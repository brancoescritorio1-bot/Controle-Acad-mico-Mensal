import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "sb_secret_IsUaKY6lLQP6OSb8bEfKKw_XjzvVjp-";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for backend operations if available to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || "https://gymxdeijrgorugqqiteh.supabase.co",
      supabaseKey: process.env.SUPABASE_ANON_KEY || "sb_secret_IsUaKY6lLQP6OSb8bEfKKw_XjzvVjp-"
    });
  });

  // Authentication Middleware
  const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  };

  // Apply middleware to all subsequent API routes
  app.use("/api", authenticateUser);

  app.get("/api/users", async (req, res) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
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
          updateData[field] = body[field] ? parseFloat(body[field].toString()) : 0;
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
          act1_grade: nota?.atividade_1_nota || 0,
          act2_status: nota?.atividade_2_status || 'Não iniciada',
          act2_grade: nota?.atividade_2_nota || 0,
          exam_grade: nota?.prova_nota || 0,
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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    
    const tables = ["financial_categories", "financial_accounts", "financial_transactions", "financial_responsibles", "clients", "client_sales", "client_installments"];
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
        category_id, 
        account_id, 
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
          category_id,
          account_id,
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
        description, amount, type, category_id, account_id, date, status, user_id: user.id,
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
        updateData[field] = req.body[field];
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
    const accountMap: Record<number, string> = {};
    if (accounts) {
      accounts.forEach(acc => {
        accountMap[acc.id] = acc.type;
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

    const now = new Date();
    const filterMonth = month ? Number(month) : now.getMonth();
    const filterYear = year ? Number(year) : now.getFullYear();

    const responsibilitySummary: Record<string, number> = {};

    if (transactions) {
      transactions.forEach(t => {
        const amount = Number(t.amount || 0);
        const accType = accountMap[t.account_id];
        const account = accounts?.find(a => a.id === t.account_id);
        
        // 1. Global Balances (Total and Cash)
        if (t.status === 'pago') {
          if (t.type === 'receita') {
            totalIncome += amount;
            if (accType !== 'credito') cashIncome += amount;
          } else {
            totalExpense += amount;
            if (accType !== 'credito') cashExpense += amount;
          }
        }

        // 2. Monthly Dashboard Logic (Aligned with Invoices)
        let belongsToMonth = false;
        
        if (accType === 'credito' && account?.closing_day) {
          const closingDay = account.closing_day;
          const [y, m, d] = t.date.split('-').map(Number);
          const tDate = new Date(y, m - 1, d);
          
          const invoiceEnd = new Date(filterYear, filterMonth, closingDay);
          const invoiceStart = new Date(filterYear, filterMonth - 1, closingDay + 1);
          
          if (tDate >= invoiceStart && tDate <= invoiceEnd) {
            belongsToMonth = true;
          }
        } else {
          const [tYear, tMonth] = t.date.split('-');
          if (Number(tYear) === filterYear && Number(tMonth) - 1 === filterMonth) {
            belongsToMonth = true;
          }
        }

        if (belongsToMonth) {
          if (t.status === 'pago') {
            if (t.type === 'receita') monthIncome += amount;
            else monthExpense += amount;
          }

          if (t.splits && Array.isArray(t.splits)) {
            t.splits.forEach((s: any) => {
              const name = s.name || 'Outros';
              const sAmount = Number(s.amount || 0);
              responsibilitySummary[name] = (responsibilitySummary[name] || 0) + sAmount;
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
      responsibility_summary: responsibilitySummary,
      transactions, 
      accounts 
    });
  });

  // --- Client Module Routes ---

  // Clients
  app.get("/api/clients", async (req, res) => {
    const user = (req as any).user;
    const { data, error } = await supabase.from("clients").select("*").eq("user_id", user.id).order('name');
    if (error) return res.status(500).json(error);
    res.json(data || []);
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
    const { status, payment_date } = req.body;
    
    const { error } = await supabase.from("client_installments")
      .update({ status, payment_date })
      .eq("id", req.params.id)
      .eq("user_id", user.id);
      
    if (error) return res.status(500).json(error);
    res.json({ success: true });
  });

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

  app.listen(PORT, "0.0.0.0", async () => {
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

startServer();
