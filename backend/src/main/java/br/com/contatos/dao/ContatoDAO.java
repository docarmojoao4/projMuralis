package br.com.contatos.dao;

import br.com.contatos.model.Contato;
import br.com.contatos.util.ConnectionFactory; // Importa sua classe de conexão

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ContatoDAO {

    /**
     * RF09: Lista todos os contatos de um cliente específico.
     */
    public List<Contato> listarPorCliente(int clienteId) throws SQLException {
        String sql = "SELECT * FROM Contato WHERE cliente_id = ?";
        List<Contato> contatos = new ArrayList<>();

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, clienteId);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Contato contato = new Contato(
                            rs.getInt("id"),
                            rs.getInt("cliente_id"),
                            rs.getString("tipo"),
                            rs.getString("valor"),
                            rs.getString("observacao")
                    );
                    contatos.add(contato);
                }
            }
        }
        return contatos;
    }

    /**
     * RF06: Cadastra um novo contato para um cliente.
     */
    public Contato salvar(Contato contato) throws SQLException {
        String sql = "INSERT INTO Contato (cliente_id, tipo, valor, observacao) VALUES (?, ?, ?, ?)";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setInt(1, contato.clienteId());
            stmt.setString(2, contato.tipo());
            stmt.setString(3, contato.valor());
            stmt.setString(4, contato.observacao());

            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    int idGerado = rs.getInt(1);
                    // Retorna o objeto Contato completo com o ID gerado
                    return new Contato(idGerado, contato.clienteId(), contato.tipo(), contato.valor(), contato.observacao());
                }
            }
        }
        return null; // Ou lançar uma exceção
    }

    /**
     * RF07: Atualiza os dados de um contato existente.
     */
    public Contato atualizar(Contato contato) throws SQLException {
        String sql = "UPDATE Contato SET tipo = ?, valor = ?, observacao = ? WHERE id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, contato.tipo());
            stmt.setString(2, contato.valor());
            stmt.setString(3, contato.observacao());
            stmt.setInt(4, contato.id()); // O ID é a condição do WHERE

            stmt.executeUpdate();
            return contato; // Retorna o objeto atualizado
        }
    }

    /**
     * RF08: Exclui um contato específico.
     */
    public void excluir(int id) throws SQLException {
        String sql = "DELETE FROM Contato WHERE id = ?";

        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, id);
            stmt.executeUpdate();
        }
    }

    /**
     * RN07: Exclui TODOS os contatos de um cliente.
     */
    public void excluirPorClienteId(int clienteId, Connection conn) throws SQLException {
        String sql = "DELETE FROM Contato WHERE cliente_id = ?";

        // Note que NÃO abrimos ou fechamos a conexão aqui
        // Estamos usando a conexão que o ClienteDAO abriu
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, clienteId);
            stmt.executeUpdate();
        }
    }
}