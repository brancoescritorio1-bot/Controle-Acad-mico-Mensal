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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
