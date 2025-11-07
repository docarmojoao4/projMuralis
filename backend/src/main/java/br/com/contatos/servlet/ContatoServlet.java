package br.com.contatos.servlet;

import br.com.contatos.dao.ContatoDAO;
import br.com.contatos.model.Contato;
import br.com.contatos.util.LocalDateTypeAdapter; // Importa o adapter de data
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@WebServlet("/api/contatos/*")
public class ContatoServlet extends HttpServlet {

    private final ContatoDAO contatoDAO = new ContatoDAO();
    private final Gson gson = new GsonBuilder()
            .registerTypeAdapter(LocalDate.class, new LocalDateTypeAdapter())
            .create();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String clienteIdParam = req.getParameter("clienteId");

        if (clienteIdParam == null || clienteIdParam.isEmpty()) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "O parâmetro 'clienteId' é obrigatório.");
            return;
        }

        try {
            int clienteId = Integer.parseInt(clienteIdParam);
            List<Contato> contatos = contatoDAO.listarPorCliente(clienteId);

            String jsonResponse = gson.toJson(contatos);
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print(jsonResponse);

        } catch (NumberFormatException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "O 'clienteId' deve ser um número.");
        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro ao listar contatos: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            String jsonRequest = req.getReader().lines().collect(Collectors.joining());
            Contato novoContato = gson.fromJson(jsonRequest, Contato.class);

            if (novoContato.tipo() == null || novoContato.tipo().isEmpty() ||
                    novoContato.valor() == null || novoContato.valor().isEmpty()) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Os campos 'tipo' e 'valor' são obrigatórios.");
                return;
            }

            if (novoContato.clienteId() == null) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "O campo 'clienteId' é obrigatório.");
                return;
            }

            Contato contatoSalvo = contatoDAO.salvar(novoContato);

            String jsonResponse = gson.toJson(contatoSalvo);
            resp.setStatus(HttpServletResponse.SC_CREATED);
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print(jsonResponse);

        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro ao salvar contato: " + e.getMessage());
        }
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            Integer contatoId = extrairIdDaUrl(req);
            if (contatoId == null) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "ID do contato não fornecido na URL.");
                return;
            }

            String jsonRequest = req.getReader().lines().collect(Collectors.joining());
            Contato contatoParaAtualizar = gson.fromJson(jsonRequest, Contato.class);


            if (contatoParaAtualizar.tipo() == null || contatoParaAtualizar.tipo().isEmpty() ||
                    contatoParaAtualizar.valor() == null || contatoParaAtualizar.valor().isEmpty()) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Os campos 'tipo' e 'valor' são obrigatórios.");
                return;
            }

            Contato contatoAtualizado = new Contato(
                    contatoId,
                    contatoParaAtualizar.clienteId(), // O clienteId não deve mudar, mas o JSON pode conter
                    contatoParaAtualizar.tipo(),
                    contatoParaAtualizar.valor(),
                    contatoParaAtualizar.observacao()
            );

            contatoDAO.atualizar(contatoAtualizado);

            String jsonResponse = gson.toJson(contatoAtualizado);
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print(jsonResponse);

        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro ao atualizar contato: " + e.getMessage());
        }
    }

    /**
     * RF08: Excluir um contato.
     * Acessado via DELETE /api/contatos/{id}
     */
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            Integer contatoId = extrairIdDaUrl(req);
            if (contatoId == null) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "ID do contato não fornecido na URL.");
                return;
            }

            contatoDAO.excluir(contatoId);

            resp.setStatus(HttpServletResponse.SC_NO_CONTENT); // Resposta 204: Sucesso, sem conteúdo

        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro ao excluir contato: " + e.getMessage());
        }
    }

    /**
     * Método utilitário para extrair o ID de URLs no padrão /api/contatos/{id}
     */
    private Integer extrairIdDaUrl(HttpServletRequest req) {
        String pathInfo = req.getPathInfo(); // Retorna "/123"
        if (pathInfo != null && pathInfo.length() > 1) {
            try {
                // Remove a barra "/" inicial e converte para Inteiro
                return Integer.parseInt(pathInfo.substring(1));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}