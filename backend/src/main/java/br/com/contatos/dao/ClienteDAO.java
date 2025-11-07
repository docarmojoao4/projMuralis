package br.com.contatos.dao;

import br.com.contatos.model.Cliente;
import br.com.contatos.util.ConnectionFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ClienteDAO {

    /**
     * RF01: Cadastra um novo cliente (com limpeza de CPF)
     */
    public Cliente salvar(Cliente cliente) throws SQLException {
        String sql = "INSERT INTO Cliente (nome, cpf, data_nascimento, endereco) VALUES (?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setString(1, cliente.nome());
            stmt.setString(2, cliente.cpf().replaceAll("[^0-9]", ""));
            stmt.setDate(3, Date.valueOf(cliente.dataNascimento()));
            stmt.setString(4, cliente.endereco());

            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    int idGerado = rs.getInt(1);
                    return new Cliente(idGerado, cliente.nome(), cliente.cpf(), cliente.dataNascimento(), cliente.endereco());
                }
            }
        }
        return null;
    }

    /**
     * RF04: Lista todos os clientes
     */
    public List<Cliente> listarTodos() throws SQLException {
        String sql = "SELECT * FROM Cliente ORDER BY nome";
        List<Cliente> clientes = new ArrayList<>();

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                clientes.add(new Cliente(
                        rs.getInt("id"),
                        rs.getString("nome"),
                        rs.getString("cpf"),
                        rs.getDate("data_nascimento").toLocalDate(),
                        rs.getString("endereco")
                ));
            }
        }
        return clientes;
    }

    /**
     * RF05: Busca clientes por Nome (parcial) ou CPF (parcial).
     */
    public List<Cliente> buscar(String termo) throws SQLException {
        String cpfLimpo = termo.replaceAll("[^0-9]", "");

        String sql = "SELECT * FROM Cliente WHERE nome LIKE ? OR cpf LIKE ?";
        List<Cliente> clientes = new ArrayList<>();

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {


            stmt.setString(1, "%" + termo + "%");

            if (cpfLimpo.isEmpty()) {

                stmt.setString(2, "§-NEVER-MATCH-§");
            } else {

                stmt.setString(2, cpfLimpo + "%");
            }


            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    clientes.add(new Cliente(
                            rs.getInt("id"),
                            rs.getString("nome"),
                            rs.getString("cpf"),
                            rs.getDate("data_nascimento").toLocalDate(),
                            rs.getString("endereco")
                    ));
                }
            }
        }
        return clientes;
    }

    /**
     * RF02 (Parte 1): Busca um cliente único pelo seu ID.
     */
    public Cliente buscarPorId(int id) throws SQLException {
        String sql = "SELECT * FROM Cliente WHERE id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, id);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Cliente(
                            rs.getInt("id"),
                            rs.getString("nome"),
                            rs.getString("cpf"),
                            rs.getDate("data_nascimento").toLocalDate(),
                            rs.getString("endereco")
                    );
                }
            }
        }
        return null;
    }

    /**
     * RF02 (Parte 2): Atualiza os dados de um cliente.
     */
    public Cliente atualizar(Cliente cliente) throws SQLException {
        String sql = "UPDATE Cliente SET nome = ?, cpf = ?, data_nascimento = ?, endereco = ? WHERE id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, cliente.nome());
            stmt.setString(2, cliente.cpf().replaceAll("[^0-9]", ""));
            stmt.setDate(3, java.sql.Date.valueOf(cliente.dataNascimento()));
            stmt.setString(4, cliente.endereco());
            stmt.setInt(5, cliente.id());

            stmt.executeUpdate();
            return cliente;
        }
    }

    /**
     * RF03: Exclui um cliente e (RN07) todos os seus contatos associados.
     */
    public void excluir(int clienteId) throws SQLException {
        Connection conn = null;
        try {
            conn = ConnectionFactory.getConnection();
            conn.setAutoCommit(false);

            ContatoDAO contatoDAO = new ContatoDAO();
            contatoDAO.excluirPorClienteId(clienteId, conn);

            String sqlDeleteCliente = "DELETE FROM Cliente WHERE id = ?";
            try (PreparedStatement stmtCliente = conn.prepareStatement(sqlDeleteCliente)) {
                stmtCliente.setInt(1, clienteId);
                stmtCliente.executeUpdate();
            }

            conn.commit();

        } catch (SQLException e) {
            if (conn != null) conn.rollback();
            throw new SQLException("Erro ao excluir cliente e seus contatos", e);
        } finally {
            if (conn != null) {
                conn.setAutoCommit(true);
                conn.close();
            }
        }
    }

    /**
     * RN03: Verifica se um CPF já existe (e ignora o ID do próprio cliente)
     */
    public boolean cpfJaExiste(String cpf, Integer idParaIgnorar) throws SQLException {
        String sql = "SELECT COUNT(*) FROM Cliente WHERE cpf = ? AND id != ?";
        String cpfLimpo = cpf.replaceAll("[^0-9]", "");

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, cpfLimpo);
            stmt.setInt(2, (idParaIgnorar == null) ? 0 : idParaIgnorar);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        }
        return false;
    }
}