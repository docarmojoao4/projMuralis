package br.com.contatos.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConnectionFactory {

    private static final String URL = "jdbc:mysql://localhost:3306/agenda"; //nome do banco no final da url
    private static final String USER = "root"; // nome do user
    private static final String PASSWORD = ""; // senha do banco

    public static Connection getConnection() {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            return DriverManager.getConnection(URL, USER, PASSWORD);
        } catch (SQLException | ClassNotFoundException e) {

            throw new RuntimeException("Erro ao conectar ao banco de dados", e);
        }
    }
}