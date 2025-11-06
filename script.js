document.addEventListener('DOMContentLoaded', () => {
    // --- URLs DA API (NOVO) ---
    const API_BASE_URL = 'http://localhost:8080/gestao-clientes-app-1.0-SNAPSHOT/api';
    const API_CLIENTES_URL = `${API_BASE_URL}/clientes`;
    const API_CONTATOS_URL = `${API_BASE_URL}/contatos`;

    // --- SELETORES DO DOM (Igual) ---
    // Seções principais
    const gestaoClientes = document.getElementById('gestaoClientes');
    const gestaoContatos = document.getElementById('gestaoContatos');

    // Formulário Cliente
    const formCliente = document.getElementById('formCliente');
    const clienteIdInput = document.getElementById('clienteId');
    const nomeInput = document.getElementById('nome');
    const cpfInput = document.getElementById('cpf');
    const dataNascimentoInput = document.getElementById('data_nascimento');
    const enderecoInput = document.getElementById('endereco');
    const btnCancelarCliente = document.getElementById('btnCancelarCliente');

    // Máscara de CPF (Igual)
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.substring(0, 11);
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3}\.\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3}\.\d{3}\.\d{3})(\d{1,2})/, '$1-$2');
        e.target.value = value;
    });

    // Lista Cliente
    const buscaClienteInput = document.getElementById('buscaCliente');
    const tabelaClientesBody = document.getElementById('tabelaClientes').querySelector('tbody');

    // Formulário Contato
    // ... (seletores de contato iguais) ...
    const formContato = document.getElementById('formContato');
    const nomeClienteContatos = document.getElementById('nomeClienteContatos');
    const contatoIdInput = document.getElementById('contatoId');
    const tipoInput = document.getElementById('tipo');
    const valorInput = document.getElementById('valor');
    const observacaoInput = document.getElementById('observacao');
    const btnCancelarContato = document.getElementById('btnCancelarContato');
    const tabelaContatosBody = document.getElementById('tabelaContatos').querySelector('tbody');
    const btnVoltarClientes = document.getElementById('btnVoltarClientes');


    // --- ESTADO DA APLICAÇÃO (MODIFICADO) ---
    // Removemos os arrays 'clientes' e 'contatos'.
    // Os dados agora vivem no servidor.
    let clienteEmEdicaoId = null;
    let contatoEmEdicaoId = null;
    let clienteVisaoContatosId = null;

    // --- FUNÇÕES DE PERSISTÊNCIA (REMOVIDAS) ---
    // Removemos salvarClientes() e salvarContatos().
    // A persistência é feita pela API.

    // --- FUNÇÕES DE RENDERIZAÇÃO (UI) ---

    /**
     * RF04: Renderiza a tabela de clientes (MODIFICADO)
     * Agora busca os dados da API Java.
     */
    const renderizarClientes = async () => {
        tabelaClientesBody.innerHTML = ''; // Limpa a tabela
        
        let clientes = [];

        try {
            // 1. FAZ A CHAMADA 'GET' PARA A API
            const response = await fetch(API_CLIENTES_URL);

            if (!response.ok) {
                // Se a resposta não for 200 (OK), lança um erro
                throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
            }

            // 2. CONVERTE A RESPOSTA (JSON) EM UM ARRAY JS
            clientes = await response.json();
            
            // Se você viu [ ] no navegador, 'clientes' será um array vazio.

        } catch (error) {
            // 3. SE FALHAR (ex: back-end desligado, erro 500)
            console.error("Falha ao buscar clientes:", error);
            tabelaClientesBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: red;">
                        Erro ao carregar clientes. O back-end está rodando?
                    </td>
                </tr>
            `;
            return; // Para a execução
        }
        
        // --- O resto da função é igual a antes ---
        
        // Aplica filtro de busca (RF05)
        const termoBusca = buscaClienteInput.value.toLowerCase();
        const clientesFiltrados = clientes.filter(cliente => 
            cliente.nome.toLowerCase().includes(termoBusca) || 
            cliente.cpf.replace(/\D/g, '').includes(termoBusca.replace(/\D/g, ''))
        );

        if (clientesFiltrados.length === 0) {
             tabelaClientesBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center;">
                        Nenhum cliente cadastrado.
                    </td>
                </tr>
            `;
            return;
        }

        clientesFiltrados.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.cpf}</td>
                <td>${formatarData(cliente.dataNascimento)}</td>
                <td>${cliente.endereco || ''}</td>
                <td class="acoes">
                    <button class="btn-contacts" data-id="${cliente.id}">Contatos (0)</button>
                    <button class="btn-edit" data-id="${cliente.id}">Editar</button>
                    <button class="btn-delete" data-id="${cliente.id}">Excluir</button>
                </td>
            `;
            // TODO: Atualizar a contagem de contatos
            tabelaClientesBody.appendChild(tr);
        });
    };

    
    const renderizarContatos = async () => {
        tabelaContatosBody.innerHTML = '';
        if (clienteVisaoContatosId === null) return;
        
        // TODO: Fazer a chamada fetch para:
        // fetch(`${API_CONTATOS_URL}?clienteId=${clienteVisaoContatosId}`)
        
        // Por enquanto, mostra vazio
        tabelaContatosBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center;">
                    Nenhum contato cadastrado para este cliente.
                </td>
            </tr>
        `;
    };

    // --- LÓGICA DE CLIENTES (RF01, RF02, RF03) ---

    /**
     * RF01: Cadastrar Cliente (MODIFICADO)
     */
    formCliente.addEventListener('submit', async (e) => { // A função agora é 'async'
        e.preventDefault();

        // 1. Coleta e valida os dados (igual a antes)
        const nome = nomeInput.value.trim();
        const cpf = cpfInput.value.trim();
        const dataNascimento = dataNascimentoInput.value;
        const endereco = enderecoInput.value.trim();

        if (!nome || !cpf) {
            alert("Nome e CPF são obrigatórios! (RN01, RN04)");
            return;
        }
        if (cpf.length !== 14) {
            alert("CPF inválido. Deve ter o formato 123.456.789-00.");
            return;
        }
        if (!dataNascimento || !isDataValida(dataNascimento)) {
             alert("Data de Nascimento inválida! (RN05)");
            return;
        }
        
        // 2. Monta o objeto (payload) para enviar à API
        const clienteData = {
            nome: nome,
            cpf: cpf,
            dataNascimento: dataNascimento, // Formato "YYYY-MM-DD"
            endereco: endereco
        };

        try {
            let response;
            if (clienteEmEdicaoId) {
                // RF02: Editando cliente (Ainda não implementado no back-end)
                alert("Função 'Editar' ainda não implementada.");
                // response = await fetch(`${API_CLIENTES_URL}/${clienteEmEdicaoId}`, {
                //     method: 'PUT',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(clienteData)
                // });
            } else {
                // RF01: Cadastrando novo cliente
                response = await fetch(API_CLIENTES_URL, {
                    method: 'POST', // Usa o método POST
                    headers: {
                        'Content-Type': 'application/json' // Avisa que estamos enviando JSON
                    },
                    body: JSON.stringify(clienteData) // Converte o objeto JS em texto JSON
                });
            }

            // 3. Verifica se a API deu erro
            if (!response.ok) {
                const errorText = await response.text();
                // Tenta pegar a mensagem de erro que o back-end enviou
                throw new Error(errorText || `Erro na API: ${response.status}`);
            }

            // 4. Se deu certo (POST ou PUT)
            const clienteSalvo = await response.json();
            console.log("Cliente salvo com sucesso:", clienteSalvo);

        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
            // Mostra a mensagem de erro vinda do back-end (ex: CPF já existe)
            alert(`Erro ao salvar: ${error.message}`);
        }

        // 5. Recarrega a lista do servidor e limpa o formulário
        renderizarClientes();
        resetarFormularioCliente();
    });

    // Ações na tabela de clientes (Editar, Excluir, Ver Contatos)
    // (Ainda não implementado, mas preparado)
    tabelaClientesBody.addEventListener('click', (e) => {
        const target = e.target;
        const clienteId = parseInt(target.dataset.id);

        if (target.classList.contains('btn-edit')) {
            alert("Função 'Editar' (RF02) ainda não implementada.");
            // prepararEdicaoCliente(clienteId);
        } else if (target.classList.contains('btn-delete')) {
            alert("Função 'Excluir' (RF03) ainda não implementada.");
            // excluirCliente(clienteId);
        } else if (target.classList.contains('btn-contacts')) {
            mostrarGestaoContatos(clienteId);
        }
    });

    // ... (O resto das funções auxiliares e de contatos permanecem iguais por enquanto) ...
    // ...
    
    // (Funções de Contato - ainda não conectadas)
    const mostrarGestaoContatos = (clienteId) => {
        const clienteNome = "Nome do Cliente"; // Precisamos buscar isso
        clienteVisaoContatosId = clienteId;
        nomeClienteContatos.textContent = clienteNome;
        gestaoClientes.classList.add('hidden');
        gestaoContatos.classList.remove('hidden');
        renderizarContatos();
        resetarFormularioContato();
    };

    btnVoltarClientes.addEventListener('click', () => {
        clienteVisaoContatosId = null;
        gestaoContatos.classList.add('hidden');
        gestaoClientes.classList.remove('hidden');
        renderizarClientes();
    });

    formContato.addEventListener('submit', (e) => {
        e.preventDefault();
        alert("Função 'Salvar Contato' (RF06) ainda não implementada.");
        resetarFormularioContato();
    });
    
    tabelaContatosBody.addEventListener('click', (e) => {
         if (target.classList.contains('btn-edit')) {
            alert("Função 'Editar Contato' (RF07) ainda não implementada.");
        } else if (target.classList.contains('btn-delete')) {
            alert("Função 'Excluir Contato' (RF08) ainda não implementada.");
        }
    });
    
    // (Funções de Reset - Iguais)
    btnCancelarCliente.addEventListener('click', resetarFormularioCliente);
    function resetarFormularioCliente() {
        clienteEmEdicaoId = null;
        formCliente.reset();
        btnCancelarCliente.classList.add('hidden');
    }
    btnCancelarContato.addEventListener('click', resetarFormularioContato);
    function resetarFormularioContato() {
        contatoEmEdicaoId = null;
        formContato.reset();
        btnCancelarContato.classList.add('hidden');
    }

    // --- FUNÇÕES UTILITÁRIAS (Iguais) ---
    const getContatosCliente = (clienteId) => {
        // Esta função precisará ser removida ou alterada para uma chamada de API
        return []; 
    };

    const formatarData = (dataString) => {
        if (!dataString) return '';
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    const isDataValida = (dataString) => {
        const [ano, mes, dia] = dataString.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        if (dataObj.getFullYear() !== ano || dataObj.getMonth() !== mes - 1 || dataObj.getDate() !== dia) {
            return false;
        }
        return dataObj <= new Date();
    };
    
    // --- INICIALIZAÇÃO ---
    // A primeira coisa que a página faz é buscar os clientes no back-end.
    renderizarClientes();
});
