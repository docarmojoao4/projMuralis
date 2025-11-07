document.addEventListener('DOMContentLoaded', () => {
    // --- URLs DA API ---
    const API_BASE_URL = 'http://localhost:8080/gestao-clientes-app-1.0-SNAPSHOT/api';
    const API_CLIENTES_URL = `${API_BASE_URL}/clientes`;
    const API_CONTATOS_URL = `${API_BASE_URL}/contatos`;

    // --- SELETORES DO DOM ---
    const gestaoClientes = document.getElementById('gestaoClientes');
    const gestaoContatos = document.getElementById('gestaoContatos');

    // Formulário Cliente
    const formCliente = document.getElementById('formCliente');
    const formClienteTitulo = formCliente.querySelector('h3');
    const clienteIdInput = document.getElementById('clienteId');
    const nomeInput = document.getElementById('nome');
    const cpfInput = document.getElementById('cpf');
    const dataNascimentoInput = document.getElementById('data_nascimento');
    const enderecoInput = document.getElementById('endereco');
    const btnCancelarCliente = document.getElementById('btnCancelarCliente');

    // Máscara de CPF
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
    const formContato = document.getElementById('formContato');
    const formContatoTitulo = formContato.querySelector('h3');
    const nomeClienteContatos = document.getElementById('nomeClienteContatos');
    const contatoIdInput = document.getElementById('contatoId');
    const tipoInput = document.getElementById('tipo');
    const valorInput = document.getElementById('valor');
    const observacaoInput = document.getElementById('observacao');
    const btnCancelarContato = document.getElementById('btnCancelarContato');
    const tabelaContatosBody = document.getElementById('tabelaContatos').querySelector('tbody');
    const btnVoltarClientes = document.getElementById('btnVoltarClientes');


    // --- ESTADO DA APLICAÇÃO ---
    let clienteEmEdicaoId = null;
    let contatoEmEdicaoId = null;
    let clienteVisaoContatosId = null;
    let contatosAtuais = []; // Armazena os contatos da visão atual (para edição)
    let buscaDebounceTimer; // Para o timer da busca

    // --- FUNÇÕES DE RENDERIZAÇÃO (UI) ---

    /**
     * RF04/RF05: Renderiza a tabela de clientes
     */
    const renderizarClientes = async () => {
        tabelaClientesBody.innerHTML = '';
        let clientes = [];
        
        const termoBusca = buscaClienteInput.value;
        let url = API_CLIENTES_URL;

        if (termoBusca) { // RF05
            url = `${API_CLIENTES_URL}?busca=${encodeURIComponent(termoBusca)}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
            }
            clientes = await response.json();
        } catch (error) {
            console.error("Falha ao buscar clientes:", error);
            tabelaClientesBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Erro ao carregar clientes. O back-end está rodando?</td></tr>`;
            return;
        }
        
        if (clientes.length === 0) {
             tabelaClientesBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        clientes.forEach(cliente => {
            const tr = document.createElement('tr');
            // Formata o CPF para exibição (assumindo que veio limpo do banco)
            const cpfFormatado = cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            
            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cpfFormatado}</td>
                <td>${formatarData(cliente.dataNascimento)}</td>
                <td>${cliente.endereco || ''}</td>
                <td class="acoes">
                    <button class="btn-contacts" data-id="${cliente.id}">Contatos</button>
                    <button class="btn-edit" data-id="${cliente.id}">Editar</button>
                    <button class="btn-delete" data-id="${cliente.id}">Excluir</button>
                </td>
            `;
            // TODO: Atualizar a contagem de contatos. Isso exigiria uma mudança no back-end
            // para o GET /api/clientes retornar a contagem, o que é mais complexo (N+1 queries).
            // Por enquanto, o botão não mostra contagem.
            tabelaClientesBody.appendChild(tr);
        });
    };

    
    /**
     * RF09: Renderiza a tabela de contatos
     */
    const renderizarContatos = async () => {
        tabelaContatosBody.innerHTML = '';
        contatosAtuais = []; // Limpa o array local
        if (clienteVisaoContatosId === null) return;
        
        try {
            // Chama a API: GET /api/contatos?clienteId=123
            const response = await fetch(`${API_CONTATOS_URL}?clienteId=${clienteVisaoContatosId}`);
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.statusText}`);
            }
            contatosAtuais = await response.json(); // Salva no array local

        } catch (error) {
            console.error("Falha ao buscar contatos:", error);
            tabelaContatosBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Erro ao carregar contatos.</td></tr>`;
            return;
        }

        if (contatosAtuais.length === 0) {
            tabelaContatosBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum contato cadastrado.</td></tr>`;
            return;
        }

        contatosAtuais.forEach(contato => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${contato.tipo}</td>
                <td>${contato.valor}</td>
                <td>${contato.observacao || ''}</td>
                <td class="acoes">
                    <button class="btn-edit" data-id="${contato.id}">Editar</button>
                    <button class="btn-delete" data-id="${contato.id}">Excluir</button>
                </td>
            `;
            tabelaContatosBody.appendChild(tr);
        });
    };

    // --- LÓGICA DE CLIENTES ---

    /**
     * RF01/RF02: Cadastrar ou Editar Cliente
     */
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Coleta e valida os dados (RN01, RN04, RN05, RN08)
        const nome = nomeInput.value.trim();
        const cpf = cpfInput.value.trim();
        const dataNascimento = dataNascimentoInput.value;
        const endereco = enderecoInput.value.trim();

        if (!nome || !cpf) { 
            alert("Nome e CPF são obrigatórios!");
            return;
        }
        if (cpf.length !== 14) {
            alert("CPF inválido. Deve ter o formato 123.456.789-00.");
            return;
        }
        if (!dataNascimento || !isDataValida(dataNascimento)) {
             alert("Data de Nascimento inválida!");
            return;
        }
        
        // 2. Monta o objeto (payload)
        const clienteData = {
            nome: nome,
            cpf: cpf, // O back-end vai limpar a máscara
            dataNascimento: dataNascimento,
            endereco: endereco
        };

        try {
            let response;
            let url = API_CLIENTES_URL;
            let method = 'POST'; // RF01

            if (clienteEmEdicaoId) {
                // RF02: Editando cliente
                url = `${API_CLIENTES_URL}/${clienteEmEdicaoId}`;
                method = 'PUT';
            }
            
            response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clienteData)
            });

            // 3. Verifica se a API deu erro (validação do back-end, RN03, etc)
            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = parseErrorMessage(errorText);
                throw new Error(errorMsg || `Erro na API: ${response.status}`);
            }

            const clienteSalvo = await response.json();
            console.log("Cliente salvo com sucesso:", clienteSalvo);

        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
            alert(`Erro ao salvar: ${error.message}`); // Exibe a mensagem de erro (ex: CPF duplicado)
        }

        renderizarClientes();
        resetarFormularioCliente();
    });

    /**
     * RF05: Ativa a busca ao digitar (com Debounce)
     */
    buscaClienteInput.addEventListener('input', () => {
        clearTimeout(buscaDebounceTimer);
        buscaDebounceTimer = setTimeout(() => {
            renderizarClientes();
        }, 300);
    });

    /**
     * Listener para botões de Ação da Tabela (Editar, Excluir, Contatos)
     */
    tabelaClientesBody.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button');
        if (!button) return; 
        
        const clienteId = parseInt(button.dataset.id);
        if (isNaN(clienteId)) return;

        if (button.classList.contains('btn-edit')) {
            prepararEdicaoCliente(clienteId); // RF02
        } else if (button.classList.contains('btn-delete')) {
            excluirCliente(clienteId); // RF03
        } else if (button.classList.contains('btn-contacts')) {
            mostrarGestaoContatos(clienteId); // RF09
        }
    });

    /**
     * RF02 (Parte 1): Prepara o formulário para edição.
     */
    const prepararEdicaoCliente = async (id) => {
        try {
            const response = await fetch(`${API_CLIENTES_URL}/${id}`);
            if (!response.ok) {
                throw new Error(`Erro ao buscar cliente: ${response.statusText}`);
            }
            const cliente = await response.json();
            
            nomeInput.value = cliente.nome;
            cpfInput.value = cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            dataNascimentoInput.value = cliente.dataNascimento;
            enderecoInput.value = cliente.endereco;

            clienteEmEdicaoId = id;
            
            btnCancelarCliente.classList.remove('hidden');
            formClienteTitulo.textContent = "Editar Cliente";
            window.scrollTo(0, 0);

        } catch (error) {
            console.error("Erro ao preparar edição:", error);
            alert(`Não foi possível carregar o cliente para edição: ${error.message}`);
        }
    };
    
    /**
     * RF03: Exclui um cliente (e RN07)
     */
    const excluirCliente = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este cliente?\nTodos os seus contatos também serão removidos.")) {
            return;
        }

        try {
            const response = await fetch(`${API_CLIENTES_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = parseErrorMessage(errorText);
                throw new Error(errorMsg || `Erro na API: ${response.status}`);
            }
            
            console.log("Cliente excluído com sucesso.");

        } catch (error) {
            console.error("Erro ao excluir cliente:", error);
            alert(`Erro ao excluir: ${error.message}`);
        }

        renderizarClientes();
    };


    // (Funções de Reset)
    btnCancelarCliente.addEventListener('click', resetarFormularioCliente);
    
    function resetarFormularioCliente() {
        clienteEmEdicaoId = null;
        formCliente.reset();
        btnCancelarCliente.classList.add('hidden');
        formClienteTitulo.textContent = "Cadastro de Cliente";
    }

    // --- LÓGICA DE CONTATOS (RF06, RF07, RF08, RN02) ---
    
    /**
     * RF09 (Trigger): Mostra a tela de gerenciamento de contatos
     */
    const mostrarGestaoContatos = async (clienteId) => {
        try {
            const response = await fetch(`${API_CLIENTES_URL}/${clienteId}`);
            const cliente = await response.json();
            nomeClienteContatos.textContent = cliente.nome;
            
            clienteVisaoContatosId = clienteId;
            gestaoClientes.classList.add('hidden');
            gestaoContatos.classList.remove('hidden');
            renderizarContatos(); // Chama a renderização de contatos
            resetarFormularioContato();
        } catch (error) {
            alert("Erro ao carregar dados do cliente.");
        }
    };

    btnVoltarClientes.addEventListener('click', () => {
        clienteVisaoContatosId = null;
        gestaoContatos.classList.add('hidden');
        gestaoClientes.classList.remove('hidden');
        renderizarClientes();
    });

    /**
     * RF06 (Create) e RF07 (Update) para Contatos
     */
    formContato.addEventListener('submit', async (e) => {
        e.preventDefault();

        // RN02: Validação
        const tipo = tipoInput.value;
        const valor = valorInput.value.trim();
        const observacao = observacaoInput.value.trim();

        if (!tipo || !valor) {
            alert("Tipo e Valor do Contato são obrigatórios!");
            return;
        }

        const contatoData = {
            clienteId: clienteVisaoContatosId, // ID do cliente que estamos vendo
            tipo,
            valor,
            observacao
        };

        let url = API_CONTATOS_URL;
        let method = 'POST'; // RF06 (Create)

        if (contatoEmEdicaoId) {
            // RF07 (Update)
            method = 'PUT';
            url = `${API_CONTATOS_URL}/${contatoEmEdicaoId}`;
            contatoData.id = contatoEmEdicaoId; 
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contatoData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(parseErrorMessage(errorText) || `Erro na API: ${response.status}`);
            }

            console.log("Contato salvo com sucesso.");
            
        } catch (error) {
            console.error("Erro ao salvar contato:", error);
            alert(`Erro ao salvar: ${error.message}`);
        }
        
        renderizarContatos(); // Recarrega a lista de contatos
        resetarFormularioContato();
    });
    
    /**
     * Listener para botões da tabela de Contatos (Editar, Excluir)
     */
    tabelaContatosBody.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const contatoId = parseInt(button.dataset.id);

        if (button.classList.contains('btn-edit')) {
            prepararEdicaoContato(contatoId); // RF07
        } else if (button.classList.contains('btn-delete')) {
            excluirContato(contatoId); // RF08
        }
    });

    
    btnCancelarContato.addEventListener('click', resetarFormularioContato);
    
    function resetarFormularioContato() {
        contatoEmEdicaoId = null;
        formContato.reset();
        btnCancelarContato.classList.add('hidden');
        formContatoTitulo.textContent = "Adicionar/Editar Contato"; // Restaura o título
    }
    
    /**
     * RF07 (Parte 1): Prepara o formulário de contato para edição
     */
    const prepararEdicaoContato = (id) => {
        // Pega o contato do array local que já foi buscado
        const contato = contatosAtuais.find(c => c.id === id);
        if (!contato) {
            alert("Erro: Contato não encontrado.");
            return;
        }
        
        // Preenche o formulário
        tipoInput.value = contato.tipo;
        valorInput.value = contato.valor;
        observacaoInput.value = contato.observacao;
        
        contatoEmEdicaoId = id;
        
        btnCancelarContato.classList.remove('hidden');
        formContatoTitulo.textContent = "Editar Contato";
    };

    /**
     * RF08: Exclui um contato
     */
    const excluirContato = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este contato?")) {
            return;
        }

        try {
            const response = await fetch(`${API_CONTATOS_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(parseErrorMessage(errorText) || `Erro na API: ${response.status}`);
            }
            
            console.log("Contato excluído com sucesso.");

        } catch (error) {
            console.error("Erro ao excluir contato:", error);
            alert(`Erro ao excluir: ${error.message}`);
        }

        renderizarContatos(); // Recarrega a lista
    };


    // --- FUNÇÕES UTILITÁRIAS ---

    const formatarData = (dataString) => {
        if (!dataString) return '';
        const [ano, mes, dia] = dataString.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    const isDataValida = (dataString) => {
        if (!dataString) return false;
        const [ano, mes, dia] = dataString.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        if (dataObj.getFullYear() !== ano || dataObj.getMonth() !== mes - 1 || dataObj.getDate() !== dia) {
            return false;
        }
        return dataObj <= new Date(); // RN05: Não pode ser no futuro
    };
    
    function parseErrorMessage(errorText) {
        try {
            const errorJson = JSON.parse(errorText);
            return errorJson.message || errorText;
        } catch (e) {
            const match = errorText.match(/<p><b>Message<\/b>(.*?)<\/p>/);
            if (match && match[1]) {
                return match[1].trim().replace(/<br\s*\/?>/gi, ' ');
            }
        }
        // Se for um erro 409 (Conflict) do nosso back-end
        if(errorText.includes("Este CPF já está cadastrado")) {
            return "Este CPF já está cadastrado no sistema.";
        }
        
        return "Ocorreu um erro desconhecido.";
    }
    
    // --- INICIALIZAÇÃO ---
    renderizarClientes();
});
