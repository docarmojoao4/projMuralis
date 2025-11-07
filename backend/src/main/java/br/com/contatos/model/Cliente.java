package br.com.contatos.model;

import java.time.LocalDate;

public record Cliente(Integer id, String nome, String cpf, LocalDate dataNascimento, String endereco)

{
    public Cliente(String nome, String cpf, LocalDate dataNascimento, String endereco) {
        this(null, nome, cpf, dataNascimento, endereco);
    }
}