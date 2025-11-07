package br.com.contatos.servlet;

import br.com.contatos.dao.ClienteDAO;
import br.com.contatos.model.Cliente;
import br.com.contatos.util.LocalDateTypeAdapter; // Importa do nosso pacote util
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * GET /api/clientes (RF04)
 * GET /api/clientes?busca=termo (RF05)
 * GET /api/clientes/123 (RF02)
 * POST /api/clientes (RF01)
 * PUT /api/clientes/123 (RF02)
 * DELETE /api/clientes/123 (RF03)
 */
@WebServlet("/api/clientes/*")
public class ClienteServlet extends HttpServlet {

    private final ClienteDAO clienteDAO = new ClienteDAO();
    private final Gson gson = new GsonBuilder()
            .registerTypeAdapter(LocalDate.class, new LocalDateTypeAdapter())
            .create();

    /**
     * GET /api/clientes (RF04)
     * GET /api/clientes?busca=termo (RF05)
     * GET /api/clientes/123 (RF02)
     */
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            String busca = req.getParameter("busca");
            Integer clienteId = extrairIdDaUrl(req);

            if (clienteId != null) {
                // RF02: Buscar por ID
                Cliente cliente = clienteDAO.buscarPorId(clienteId);
                if (cliente == null) {
                    resp.sendError(HttpServletResponse.SC_NOT_FOUND, "Cliente não encontrado.");
                    return;
                }
                String jsonResponse = gson.toJson(cliente); // Retorna um objeto único
                resp.setContentType("application/json");
                resp.setCharacterEncoding("UTF-8");
                resp.getWriter().print(jsonResponse);

            } else {
                // RF04 e RF05: Listar ou Buscar
                List<Cliente> clientes;
                if (busca != null) {
                    clientes = clienteDAO.buscar(busca);
                } else {
                    clientes = clienteDAO.listarTodos();
                }
                String jsonResponse = gson.toJson(clientes); // Retorna uma lista
                resp.setContentType("application/json");
                resp.setCharacterEncoding("UTF-8");
                resp.getWriter().print(jsonResponse);
            }

        } catch (SQLException e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro ao buscar clientes: " + e.getMessage());
        }
    }


    /**
     * POST /api/clientes
     * Cadastra um novo cliente (RF01)
     * COM VALIDAÇÃO (RN01, RN03, RN04, RN05, RN08)
     */
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            // 1. Lê o JSON
            String jsonRequest = req.getReader().lines().collect(Collectors.joining());
            Cliente novoCliente = gson.fromJson(jsonRequest, Cliente.class);

            // --- INÍCIO DA VALIDAÇÃO (RNs) ---
            if (novoCliente.nome() == null || novoCliente.nome().trim().isEmpty()) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Nome é obrigatório (RN01/RN04).");
                return;
            }
            if (novoCliente.cpf() == null || novoCliente.cpf().trim().isEmpty()) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "CPF é obrigatório (RN01).");
                return;
            }
            // RN05: Data não pode ser nula ou no futuro
            if (novoCliente.dataNascimento() == null || novoCliente.dataNascimento().isAfter(LocalDate.now())) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Data de Nascimento é obrigatória e não pode ser no futuro (RN05).");
                return;
            }

            // RN03: Validação de CPF Único (passando 'null' como ID para ignorar)
            if (clienteDAO.cpfJaExiste(novoCliente.cpf(), null)) {
                resp.sendError(HttpServletResponse.SC_CONFLICT, "Este CPF já está cadastrado no sistema (RN03)."); // 409 Conflict
                return;
            }
            // --- FIM DA VALIDAÇÃO ---

            // 3. Salva no banco
            Cliente clienteSalvo = clienteDAO.salvar(novoCliente);

            // 4. Retorna o cliente salvo (com ID) e o status 201 (Created)
            String jsonResponse = gson.toJson(clienteSalvo);
            resp.setStatus(HttpServletResponse.SC_CREATED);
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print(jsonResponse);

        } catch (SQLException e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro de banco de dados ao salvar cliente: " + e.getMessage());
        } catch (Exception e) { // Captura erros do JSON, etc.
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Erro ao ler dados do cliente: " + e.getMessage());
        }
    }

    /**
     * RF02: Atualizar um cliente.
     * Acessado via PUT /api/clientes/{id}
     * COM VALIDAÇÃO (RN01, RN03, RN04, RN05, RN08)
     */
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            Integer clienteId = extrairIdDaUrl(req);
            if (clienteId == null) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "ID do cliente não fornecido na URL.");
                return;
            }

            String jsonRequest = req.getReader().lines().collect(Collectors.joining());
            Cliente clienteParaAtualizar = gson.fromJson(jsonRequest, Cliente.class);

            // --- INÍCIO DA VALIDAÇÃO (RNs) ---
            if (clienteParaAtualizar.nome() == null || clienteParaAtualizar.nome().trim().isEmpty()) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Nome é obrigatório (RN01/RN04).");
                return;
            }
            if (clienteParaAtualizar.cpf() == null || clienteParaAtualizar.cpf().trim().isEmpty()) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "CPF é obrigatório (RN01).");
                return;
            }
            // RN05: Data não pode ser nula ou no futuro
            if (clienteParaAtualizar.dataNascimento() == null || clienteParaAtualizar.dataNascimento().isAfter(LocalDate.now())) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Data de Nascimento é obrigatória e não pode ser no futuro (RN05).");
                return;
            }

            // RN03: Validação de CPF Único (ignorando o ID do próprio cliente)
            if (clienteDAO.cpfJaExiste(clienteParaAtualizar.cpf(), clienteId)) {
                resp.sendError(HttpServletResponse.SC_CONFLICT, "Este CPF já está cadastrado no sistema (RN03).");
                return;
            }
            // --- FIM DA VALIDAÇÃO ---

            // Recria o objeto Cliente com o ID da URL para garantir
            Cliente clienteAtualizado = new Cliente(
                    clienteId,
                    clienteParaAtualizar.nome(),
                    clienteParaAtualizar.cpf(),
                    clienteParaAtualizar.dataNascimento(),
                    clienteParaAtualizar.endereco()
            );

            clienteDAO.atualizar(clienteAtualizado);

            String jsonResponse = gson.toJson(clienteAtualizado);
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print(jsonResponse);

        } catch (SQLException e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro ao atualizar cliente: " + e.getMessage());
        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Erro ao ler dados do cliente: " + e.getMessage());
        }
    }

    /**
     * RF03: Excluir um cliente.
     * Acessado via DELETE /api/clientes/{id}
     */
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            Integer clienteId = extrairIdDaUrl(req);
            if (clienteId == null) {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "ID do cliente não fornecido na URL.");
                return;
            }

            // O DAO cuida da transação (RF03 + RN07)
            clienteDAO.excluir(clienteId);

            // Sucesso, sem conteúdo para retornar
            resp.setStatus(HttpServletResponse.SC_NO_CONTENT);

        } catch (SQLException e) {
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Erro ao excluir cliente: " + e.getMessage());
        }
    }

    /**
     * Método utilitário para extrair o ID de URLs no padrão /api/clientes/{id}
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