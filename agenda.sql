create table Cliente (
	id int primary key auto_increment,
    nome varchar(100) not null,
    cpf varchar(14) not null unique,
    data_nasc date not null,
    endereco varchar(255)
);


create table Contato(
	id int primary key auto_increment,
    cliente_id int not null,
    tipo varchar(50) not null,
    valor varchar(100) not null,
    observacao varchar(255),
    FOREIGN KEY (cliente_id) REFERENCES Cliente(id)
);
