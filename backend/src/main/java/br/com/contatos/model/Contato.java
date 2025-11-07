package br.com.contatos.model;

public record Contato(Integer id, Integer clienteId, String tipo, String valor, String observacao) {
    public Contato(Integer clienteId, String tipo, String valor, String observacao) {
        this(null, clienteId, tipo, valor, observacao);
    }
}