// Classe principal do aplicativo
class DailyTodoApp {
    constructor() {
        this.recurringTasks = [];
        this.dailyTasks = {};
        this.history = {};
        this.notes = [];
        this.currentChartPeriod = '7days'; // Default period
        this.currentTab = 'today'; // Default tab
        this.resizeTimeout = null; // For debouncing resize events
        this.currentTheme = 'light'; // Default theme
        this.tabs = ['today', 'recurring', 'analytics', 'history', 'notes']; // Array de abas para swipe
        this.swipeStartX = 0;
        this.swipeStartY = 0;
        this.swipeEndX = 0;
        this.swipeEndY = 0;
        this.isSwiping = false;
        // Garantir que estamos usando a data local correta
        const localDate = this.getLocalDate();
        this.currentDate = localDate.getFullYear() + '-' +
            String(localDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(localDate.getDate()).padStart(2, '0');
        
        this.init();
    }

    // Inicialização do aplicativo
    init() {
        this.loadData();
        this.loadNotes();
        this.loadTheme();
        this.setupEventListeners();
        this.setupPWA();
        this.updateCurrentDate(); // Garantir que a data atual esteja correta
        this.generateTodayTasks();
        this.syncTodayTasks();
        this.cleanOldData();
        this.updateUI();
        this.updateDateDisplay();
        this.updateTodayStats();
    }

    // Configuração dos event listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
                if (tab === 'notes') {
                    this.renderNotes();
                }
            });
        });

        // Add task button
        document.getElementById('add-recurring-btn').addEventListener('click', () => {
            this.showAddTaskModal();
        });

        // Add today task button
        const addTodayBtn = document.getElementById('add-today-btn');
        if (addTodayBtn) {
            addTodayBtn.addEventListener('click', () => {
                this.showAddTaskModal();
            });
        }


        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Filter buttons for recurring tasks
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.filterRecurringTasks(filter);
            });
        });

        // Period selector for analytics
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.currentTarget.dataset.period;
                this.changeChartPeriod(period);
                
                // Update active button
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // History filters
        document.querySelectorAll('.filter-btn[data-history-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.historyFilter;
                this.filterHistory(filter);
            });
        });

        // Task checkbox clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.task-checkbox')) {
                const taskId = e.target.closest('.task-checkbox').dataset.taskId;
                if (taskId) {
                    this.toggleTaskCompletion(taskId);
                    this.renderTodayTasks();
                    this.updateTodayStats();
                }
            }
        });

        // Window resize listener for responsive chart
        window.addEventListener('resize', () => {
            if (this.currentTab === 'analytics') {
                // Debounce the resize event
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.renderChart();
                }, 250);
            }
        });

        // Modal events
        document.getElementById('close-modal').addEventListener('click', () => {
            this.hideAddTaskModal();
        });

        document.getElementById('cancel-add').addEventListener('click', () => {
            this.hideAddTaskModal();
        });

        document.getElementById('close-details-modal').addEventListener('click', () => {
            this.hideTaskDetailsModal();
        });

        document.getElementById('close-details').addEventListener('click', () => {
            this.hideTaskDetailsModal();
        });

        // Form submission
        document.getElementById('add-task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Task type toggle
        const taskTypeToggle = document.getElementById('task-type-toggle');
        if (taskTypeToggle) {
            taskTypeToggle.addEventListener('change', () => {
                this.toggleTaskType();
                
                // Se está mudando para "Recorrente", marcar o dia atual
                if (taskTypeToggle.checked) {
                    const localDate = this.getLocalDate();
                    const currentWeekday = localDate.getDay();
                    
                    // Marcar apenas o dia atual
                    for (let i = 0; i < 7; i++) {
                        const checkbox = document.getElementById(`weekday-${i}`);
                        if (checkbox) {
                            checkbox.checked = (i === currentWeekday);
                        }
                    }
                }
            });
        }

        // Edit task type toggle
        const editTaskTypeToggle = document.getElementById('edit-task-type-toggle');
        if (editTaskTypeToggle) {
            editTaskTypeToggle.addEventListener('change', () => {
                this.toggleEditTaskType();
            });
        }

        // Delete task
        document.getElementById('delete-task-btn').addEventListener('click', () => {
            this.deleteCurrentTask();
        });

        // Edit task button
        document.getElementById('edit-task-btn').addEventListener('click', () => {
            this.showEditTaskModal();
        });

        // Edit task modal
        document.getElementById('close-edit-modal').addEventListener('click', () => {
            this.hideEditTaskModal();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.hideEditTaskModal();
        });

        document.getElementById('edit-task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTaskEdit();
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            });
        });

        // Modal de notas
        const addNoteBtn = document.getElementById('add-note-btn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => {
                this.showAddNoteModal();
            });
        }
        const closeNoteModal = document.getElementById('close-note-modal');
        if (closeNoteModal) {
            closeNoteModal.addEventListener('click', () => {
                this.hideAddNoteModal();
            });
        }
        const cancelAddNote = document.getElementById('cancel-add-note');
        if (cancelAddNote) {
            cancelAddNote.addEventListener('click', () => {
                this.hideAddNoteModal();
            });
        }
        const addNoteForm = document.getElementById('add-note-form');
        if (addNoteForm) {
            addNoteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNote();
            });
        }
        // Excluir nota
        document.getElementById('notes-container').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-note-btn')) {
                const noteId = e.target.dataset.noteId;
                this.deleteNote(noteId);
            }
            if (e.target.classList.contains('edit-note-btn')) {
                const noteId = e.target.dataset.noteId;
                this.showEditNoteModal(noteId);
            }
        });

        // Modal de edição de notas
        const closeEditNoteModal = document.getElementById('close-edit-note-modal');
        if (closeEditNoteModal) {
            closeEditNoteModal.addEventListener('click', () => {
                this.hideEditNoteModal();
            });
        }
        const cancelEditNote = document.getElementById('cancel-edit-note');
        if (cancelEditNote) {
            cancelEditNote.addEventListener('click', () => {
                this.hideEditNoteModal();
            });
        }
        const editNoteForm = document.getElementById('edit-note-form');
        if (editNoteForm) {
            editNoteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNoteEdit();
            });
        }

        // Swipe entre abas no mobile
        this.setupSwipeNavigation();
    }

    // Configurar navegação por swipe
    setupSwipeNavigation() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        // Touch events para mobile
        mainContent.addEventListener('touchstart', (e) => {
            this.swipeStartX = e.touches[0].clientX;
            this.swipeStartY = e.touches[0].clientY;
            this.isSwiping = false;
        }, { passive: true });

        mainContent.addEventListener('touchmove', (e) => {
            if (!this.swipeStartX) return;
            
            this.swipeEndX = e.touches[0].clientX;
            this.swipeEndY = e.touches[0].clientY;
            
            const deltaX = this.swipeStartX - this.swipeEndX;
            const deltaY = this.swipeStartY - this.swipeEndY;
            
            // Verificar se é um swipe horizontal (mais horizontal que vertical)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                this.isSwiping = true;
                e.preventDefault(); // Prevenir scroll durante swipe
            }
        }, { passive: false });

        mainContent.addEventListener('touchend', (e) => {
            if (!this.isSwiping || !this.swipeStartX) return;
            
            const deltaX = this.swipeStartX - this.swipeEndX;
            const minSwipeDistance = 100; // Distância mínima para considerar como swipe
            
            if (Math.abs(deltaX) > minSwipeDistance) {
                const currentIndex = this.tabs.indexOf(this.currentTab);
                let newIndex;
                
                if (deltaX > 0) {
                    // Swipe para esquerda - próxima aba
                    newIndex = Math.min(currentIndex + 1, this.tabs.length - 1);
                } else {
                    // Swipe para direita - aba anterior
                    newIndex = Math.max(currentIndex - 1, 0);
                }
                
                if (newIndex !== currentIndex) {
                    const newTab = this.tabs[newIndex];
                    this.switchTab(newTab);
                    this.showSwipeFeedback(deltaX > 0 ? 'left' : 'right');
                }
            }
            
            // Reset
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            this.swipeEndX = 0;
            this.swipeEndY = 0;
            this.isSwiping = false;
        }, { passive: true });

        // Mouse events para desktop (opcional)
        let isMouseDown = false;
        let mouseStartX = 0;
        
        mainContent.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseStartX = e.clientX;
        });

        mainContent.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            const deltaX = mouseStartX - e.clientX;
            if (Math.abs(deltaX) > 100) {
                const currentIndex = this.tabs.indexOf(this.currentTab);
                let newIndex;
                
                if (deltaX > 0) {
                    newIndex = Math.min(currentIndex + 1, this.tabs.length - 1);
                } else {
                    newIndex = Math.max(currentIndex - 1, 0);
                }
                
                if (newIndex !== currentIndex) {
                    const newTab = this.tabs[newIndex];
                    this.switchTab(newTab);
                }
                
                isMouseDown = false;
            }
        });

        mainContent.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        mainContent.addEventListener('mouseleave', () => {
            isMouseDown = false;
        });
    }

    // Mostrar feedback visual do swipe
    showSwipeFeedback(direction) {
        const feedback = document.createElement('div');
        feedback.className = `swipe-feedback swipe-${direction}`;
        feedback.innerHTML = `<i class="fas fa-chevron-${direction === 'left' ? 'right' : 'left'}"></i>`;
        
        document.body.appendChild(feedback);
        
        // Animar entrada
        setTimeout(() => {
            feedback.classList.add('show');
        }, 10);
        
        // Remover após animação
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 500);
    }

    // Switch between tabs
    switchTab(tabName) {
        // Update current date to ensure it's always correct
        this.updateCurrentDate();
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Load specific content for each tab
        switch (tabName) {
            case 'today':
                this.renderTodayTasks();
                this.updateTodayStats();
                break;
            case 'recurring':
                this.renderRecurringTasks();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            case 'history':
                this.renderHistory();
                break;
            case 'notes':
                this.renderNotes();
                break;
        }
    }

    // Update today's statistics
    updateTodayStats() {
        const tasks = this.dailyTasks[this.currentDate] || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Update hero stats
        document.getElementById('today-total').textContent = totalTasks;
        document.getElementById('today-completed').textContent = completedTasks;
        document.getElementById('today-percentage').textContent = `${percentage}%`;

        // Update progress ring
        const progressCircle = document.getElementById('progress-circle');
        const progressText = document.getElementById('progress-text');
        if (progressCircle && progressText) {
            const circumference = 2 * Math.PI * 54; // r = 54
            const offset = circumference - (percentage / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
            progressText.textContent = `${percentage}%`;
        }
    }

    // Filter recurring tasks
    filterRecurringTasks(filter) {
        // Update filter buttons
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // Filter and render tasks
        this.renderRecurringTasks(filter);
    }

    // Filter history
    filterHistory(filter) {
        // Update filter buttons
        document.querySelectorAll('.filter-btn[data-history-filter]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-history-filter="${filter}"]`).classList.add('active');

        // Filter and render history
        this.renderHistory(filter);
    }

    // Render analytics tab
    renderAnalytics() {
        // Garantir que a data atual esteja correta antes de renderizar analytics
        this.updateCurrentDate();
        this.renderStats();
        this.renderChart();
        this.renderInsights();
    }

    // Render insights
    renderInsights() {
        const insights = this.generateInsights();
        const insightsContainer = document.querySelector('.insights-grid');
        
        if (insightsContainer) {
            insightsContainer.innerHTML = insights.map(insight => `
                <div class="insight-card">
                    <i class="fas ${insight.icon}"></i>
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            `).join('');
        }
    }

    // Gerar insights baseados nos dados do usuário
    generateInsights() {
        const insights = [];
        
        // Insight 1: Melhor dia da semana
        const bestDayInsight = this.getBestDayInsight();
        insights.push(bestDayInsight);
        
        // Insight 2: Meta sugerida
        const goalInsight = this.getGoalInsight();
        insights.push(goalInsight);
        
        // Insight 3: Tendência de produtividade
        const trendInsight = this.getTrendInsight();
        if (trendInsight) {
            insights.push(trendInsight);
        }
        
        // Insight 4: Dica personalizada
        const tipInsight = this.getTipInsight();
        insights.push(tipInsight);
        
        return insights;
    }

    // Insight sobre o melhor dia da semana
    getBestDayInsight() {
        const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const weekdayStats = [0, 0, 0, 0, 0, 0, 0];
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

        Object.keys(this.history).forEach(date => {
            const dayData = this.history[date];
            if (dayData && dayData.total > 0) {
                // Usar a data local para calcular o dia da semana
                const dateParts = date.split('-');
                const localDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                const dayOfWeek = localDate.getDay();
                weekdayStats[dayOfWeek] += dayData.percentage;
                weekdayCounts[dayOfWeek]++;
            }
        });

        let bestDay = 0;
        let bestAvg = 0;

        weekdayStats.forEach((total, index) => {
            if (weekdayCounts[index] > 0) {
                const avg = total / weekdayCounts[index];
                if (avg > bestAvg) {
                    bestAvg = avg;
                    bestDay = index;
                }
            }
        });

        const bestDayName = weekdayNames[bestDay];
        const avgPercentage = Math.round(bestAvg);

        return {
            icon: 'fa-star',
            title: 'Melhor Dia da Semana',
            description: `Você é mais produtivo nas ${bestDayName.toLowerCase()}s, com ${avgPercentage}% de conclusão em média. Tente agendar suas tarefas mais importantes neste dia.`
        };
    }

    // Insight sobre meta sugerida
    getGoalInsight() {
        const recentTasks = this.getRecentTaskCounts();
        const avgTasks = recentTasks.length > 0 ? 
            Math.round(recentTasks.reduce((sum, count) => sum + count, 0) / recentTasks.length) : 0;
        
        let suggestedGoal = avgTasks;
        let description = '';

        if (avgTasks === 0) {
            suggestedGoal = 5;
            description = 'Comece com uma meta de 5 tarefas por dia para estabelecer uma rotina produtiva.';
        } else if (avgTasks < 5) {
            suggestedGoal = Math.min(avgTasks + 2, 8);
            description = `Baseado no seu histórico, você pode aumentar sua meta diária para ${suggestedGoal} tarefas.`;
        } else if (avgTasks >= 8) {
            suggestedGoal = avgTasks + 1;
            description = `Excelente! Você pode tentar aumentar para ${suggestedGoal} tarefas por dia.`;
        } else {
            suggestedGoal = Math.min(avgTasks + 1, 10);
            description = `Você está indo bem! Considere aumentar sua meta para ${suggestedGoal} tarefas diárias.`;
        }

        return {
            icon: 'fa-target',
            title: 'Meta Sugerida',
            description: description
        };
    }

    // Insight sobre tendência de produtividade
    getTrendInsight() {
        const last7Days = this.getLast7Days();
        const recentData = last7Days.map(date => this.history[date]).filter(data => data && data.total > 0);
        
        if (recentData.length < 3) {
            return null; // Não há dados suficientes
        }

        const recentAvg = recentData.reduce((sum, data) => sum + data.percentage, 0) / recentData.length;
        const olderData = Object.keys(this.history)
            .filter(date => !last7Days.includes(date))
            .map(date => this.history[date])
            .filter(data => data && data.total > 0)
            .slice(-7);

        if (olderData.length === 0) {
            return null;
        }

        const olderAvg = olderData.reduce((sum, data) => sum + data.percentage, 0) / olderData.length;
        const improvement = recentAvg - olderAvg;

        if (Math.abs(improvement) < 5) {
            return {
                icon: 'fa-chart-line',
                title: 'Produtividade Estável',
                description: 'Sua produtividade está consistente. Continue mantendo essa rotina!'
            };
        } else if (improvement > 0) {
            return {
                icon: 'fa-arrow-up',
                title: 'Melhoria na Produtividade',
                description: `Excelente! Sua produtividade melhorou ${Math.round(improvement)}% nos últimos 7 dias.`
            };
        } else {
            return {
                icon: 'fa-arrow-down',
                title: 'Atenção à Produtividade',
                description: `Sua produtividade diminuiu ${Math.round(Math.abs(improvement))}% recentemente. Tente revisar sua rotina.`
            };
        }
    }

    // Insight com dica personalizada
    getTipInsight() {
        const tasks = this.recurringTasks;
        const completedToday = this.getTodayCompletedCount();
        const totalToday = this.getTodayTotalCount();
        
        if (tasks.length === 0) {
            return {
                icon: 'fa-lightbulb',
                title: 'Dica do Dia',
                description: 'Adicione sua primeira tarefa recorrente para começar a organizar sua rotina diária!'
            };
        }

        if (totalToday === 0) {
            return {
                icon: 'fa-lightbulb',
                title: 'Dica do Dia',
                description: 'Sincronize suas tarefas para gerar as atividades de hoje e começar a ser produtivo!'
            };
        }

        if (completedToday === 0 && totalToday > 0) {
            return {
                icon: 'fa-lightbulb',
                title: 'Dica do Dia',
                description: 'Comece o dia marcando uma tarefa como concluída. Isso motiva a continuar!'
            };
        }

        const completionRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;
        
        if (completionRate >= 80) {
            return {
                icon: 'fa-trophy',
                title: 'Dica do Dia',
                description: 'Parabéns! Você está sendo muito produtivo hoje. Continue assim!'
            };
        } else if (completionRate >= 50) {
            return {
                icon: 'fa-lightbulb',
                title: 'Dica do Dia',
                description: 'Você está no caminho certo! Tente completar mais uma tarefa para aumentar sua produtividade.'
            };
        } else {
            return {
                icon: 'fa-lightbulb',
                title: 'Dica do Dia',
                description: 'Quebre suas tarefas em partes menores para facilitar a conclusão e aumentar a motivação.'
            };
        }
    }

    // Obter contagem de tarefas dos últimos dias
    getRecentTaskCounts() {
        const last7Days = this.getLast7Days();
        return last7Days.map(date => {
            const dayData = this.history[date];
            return dayData ? dayData.total : 0;
        }).filter(count => count > 0);
    }

    // Obter contagem de tarefas concluídas hoje
    getTodayCompletedCount() {
        const todayTasks = this.dailyTasks[this.currentDate] || [];
        return todayTasks.filter(task => task.completed).length;
    }

    // Obter contagem total de tarefas hoje
    getTodayTotalCount() {
        const todayTasks = this.dailyTasks[this.currentDate] || [];
        return todayTasks.length;
    }

    // Carregamento de dados do localStorage
    loadData() {
        try {
            this.recurringTasks = JSON.parse(localStorage.getItem('recurringTasks')) || [];
            this.dailyTasks = JSON.parse(localStorage.getItem('dailyTasks')) || {};
            this.history = JSON.parse(localStorage.getItem('history')) || {};
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.recurringTasks = [];
            this.dailyTasks = {};
            this.history = {};
        }
    }

    // Notas - carregar do localStorage
    loadNotes() {
        try {
            this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        } catch (error) {
            this.notes = [];
        }
    }

    // Notas - salvar no localStorage
    saveNotes() {
        try {
            localStorage.setItem('notes', JSON.stringify(this.notes));
        } catch (error) {}
    }

    // Carregamento do tema
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                this.currentTheme = savedTheme;
                this.applyTheme();
            } else {
                // Check system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    this.currentTheme = 'dark';
                    this.applyTheme();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar tema:', error);
        }
    }

    // Salvamento do tema
    saveTheme() {
        try {
            localStorage.setItem('theme', this.currentTheme);
        } catch (error) {
            console.error('Erro ao salvar tema:', error);
        }
    }

    // Aplicação do tema
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    // Atualização do ícone do tema
    updateThemeIcon() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (this.currentTheme === 'dark') {
                icon.className = 'fas fa-moon';
                themeToggle.title = 'Alternar para tema claro';
            } else {
                icon.className = 'fas fa-sun';
                themeToggle.title = 'Alternar para tema escuro';
            }
        }
    }

    // Alternância do tema
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveTheme();
        
        // Re-render chart if on analytics tab
        if (this.currentTab === 'analytics') {
            setTimeout(() => {
                this.renderChart();
            }, 100);
        }
        
        this.showNotification(
            this.currentTheme === 'dark' ? 'Tema escuro ativado!' : 'Tema claro ativado!', 
            'info'
        );
    }

    // Salvamento de dados no localStorage
    saveData() {
        try {
            localStorage.setItem('recurringTasks', JSON.stringify(this.recurringTasks));
            localStorage.setItem('dailyTasks', JSON.stringify(this.dailyTasks));
            localStorage.setItem('history', JSON.stringify(this.history));
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
        }
    }

    // Geração automática de tarefas do dia
    generateTodayTasks() {
        if (!this.dailyTasks[this.currentDate]) {
            this.dailyTasks[this.currentDate] = [];
        }
        
        // Obter o dia da semana atual (0=domingo, 1=segunda, etc.)
        const localDate = this.getLocalDate();
        const currentWeekday = localDate.getDay();
        
        // Remover tarefas órfãs (tarefas de hoje que não têm mais uma tarefa recorrente correspondente)
        this.dailyTasks[this.currentDate] = this.dailyTasks[this.currentDate].filter(task => {
            // Se a tarefa tem recurringTaskId, verificar se a tarefa recorrente ainda existe
            if (task.recurringTaskId) {
                const recurringTaskExists = this.recurringTasks.find(rt => rt.id === task.recurringTaskId);
                if (!recurringTaskExists) {
                    return false; // Remove a tarefa órfã
                }
            }
            return true; // Mantém a tarefa
        });
        
        // Adicionar tarefas recorrentes que ainda não existem para hoje
        const existingRecurringIds = this.dailyTasks[this.currentDate].map(task => task.recurringTaskId);
        const existingTaskIds = this.dailyTasks[this.currentDate].map(task => task.id);
        
        this.recurringTasks.forEach(recurringTask => {
            // Verificar se a tarefa deve aparecer no dia atual da semana
            const shouldAppearToday = recurringTask.weekdays && recurringTask.weekdays.includes(currentWeekday);
            // Verificar se não existe uma tarefa com este ID ou recurringTaskId
            const taskExists = existingRecurringIds.includes(recurringTask.id) || existingTaskIds.includes(recurringTask.id);
            if (shouldAppearToday && !taskExists) {
                const todayTask = {
                    id: this.generateId(),
                    title: recurringTask.title,
                    description: recurringTask.description,
                    completed: false,
                    createdAt: this.getLocalDate().toISOString(),
                    recurringTaskId: recurringTask.id
                };
                this.dailyTasks[this.currentDate].push(todayTask);
            }
        });
        
        // Remover duplicações baseadas no ID
        const uniqueTasks = [];
        const seenIds = new Set();
        
        this.dailyTasks[this.currentDate].forEach(task => {
            if (!seenIds.has(task.id)) {
                seenIds.add(task.id);
                uniqueTasks.push(task);
            }
        });
        
        this.dailyTasks[this.currentDate] = uniqueTasks;
        
        this.saveData();
        this.updateHistory();
    }

    // Geração de ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Sincronização das tarefas de hoje com as tarefas recorrentes
    syncTodayTasks() {
        if (!this.dailyTasks[this.currentDate]) {
            this.dailyTasks[this.currentDate] = [];
        }
        
        // Obter o dia da semana atual (0=domingo, 1=segunda, etc.)
        const localDate = this.getLocalDate();
        const currentWeekday = localDate.getDay();
        
        // Remover tarefas órfãs (tarefas de hoje que não têm mais uma tarefa recorrente correspondente)
        this.dailyTasks[this.currentDate] = this.dailyTasks[this.currentDate].filter(task => {
            // Se a tarefa tem recurringTaskId, verificar se a tarefa recorrente ainda existe
            if (task.recurringTaskId) {
                const recurringTaskExists = this.recurringTasks.find(rt => rt.id === task.recurringTaskId);
                if (!recurringTaskExists) {
                    return false; // Remove a tarefa órfã
                }
            }
            return true; // Mantém a tarefa
        });
        
        // Adicionar tarefas recorrentes que ainda não existem para hoje
        const existingRecurringIds = this.dailyTasks[this.currentDate].map(task => task.recurringTaskId);
        
        this.recurringTasks.forEach(recurringTask => {
            // Verificar se a tarefa deve aparecer no dia atual da semana
            const shouldAppearToday = recurringTask.weekdays && recurringTask.weekdays.includes(currentWeekday);
            
            if (shouldAppearToday && !existingRecurringIds.includes(recurringTask.id)) {
                const todayTask = {
                    id: this.generateId(),
                    title: recurringTask.title,
                    description: recurringTask.description,
                    completed: false,
                    createdAt: this.getLocalDate().toISOString(),
                    recurringTaskId: recurringTask.id
                };
                this.dailyTasks[this.currentDate].push(todayTask);
            }
        });
        
        // Remover duplicações baseadas no ID
        const uniqueTasks = [];
        const seenIds = new Set();
        
        this.dailyTasks[this.currentDate].forEach(task => {
            if (!seenIds.has(task.id)) {
                seenIds.add(task.id);
                uniqueTasks.push(task);
            }
        });
        
        this.dailyTasks[this.currentDate] = uniqueTasks;
        
        this.saveData();
    }

    // Limpeza de dados antigos
    cleanOldData() {
        const localDate = this.getLocalDate();
        const thirtyDaysAgo = new Date(localDate.getTime() - (30 * 24 * 60 * 60 * 1000));
        const thirtyDaysAgoString = thirtyDaysAgo.getFullYear() + '-' +
            String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') + '-' +
            String(thirtyDaysAgo.getDate()).padStart(2, '0');

        // Remover dados de tarefas diárias antigas
        Object.keys(this.dailyTasks).forEach(date => {
            if (date < thirtyDaysAgoString) {
                delete this.dailyTasks[date];
            }
        });

        // Remover dados de histórico antigos
        Object.keys(this.history).forEach(date => {
            if (date < thirtyDaysAgoString) {
                delete this.history[date];
            }
        });

        this.saveData();
    }

    // Atualização da interface
    updateUI() {
        this.renderTodayTasks();
        this.renderRecurringTasks();
        this.renderStats();
        this.renderHistory();
    }

    // Atualização da exibição da data
    updateDateDisplay() {
        const localDate = this.getLocalDate();
        
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = localDate.toLocaleDateString('pt-BR', options);
        document.getElementById('today-date').textContent = dateString;
    }

    // Renderização das tarefas de hoje
    renderTodayTasks() {
        const tasks = this.dailyTasks[this.currentDate] || [];
        const container = document.getElementById('today-tasks');
        const emptyState = document.getElementById('today-empty');

        if (tasks.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            container.innerHTML = tasks.map(task => this.createTaskHTML(task, 'today')).join('');
        }

        this.updateTodayProgress();
    }

    // Renderização das tarefas (recorrentes + para hoje)
    renderRecurringTasks(filter = 'all') {
        const container = document.getElementById('recurring-tasks');
        const emptyState = document.getElementById('recurring-empty');
        
        // Combinar tarefas recorrentes e tarefas para hoje
        let allTasks = [...this.recurringTasks];
        
        // Adicionar tarefas para hoje se existirem
        if (this.dailyTasks[this.currentDate]) {
            const todayOnlyTasks = this.dailyTasks[this.currentDate].filter(task => task.isTodayOnly);
            allTasks = allTasks.concat(todayOnlyTasks);
        }

        // Remover duplicações baseadas no ID
        const uniqueTasks = [];
        const seenIds = new Set();
        
        allTasks.forEach(task => {
            if (!seenIds.has(task.id)) {
                seenIds.add(task.id);
                uniqueTasks.push(task);
            }
        });

        let filteredTasks = uniqueTasks;

        // Apply filter
        if (filter === 'recurring') {
            filteredTasks = uniqueTasks.filter(task => !task.isTodayOnly);
        } else if (filter === 'today-only') {
            filteredTasks = uniqueTasks.filter(task => task.isTodayOnly);
        }
        // 'all' mostra todas as tarefas (recorrentes + para hoje)

        if (filteredTasks.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            container.innerHTML = filteredTasks.map(task => this.createTaskItemHTML(task)).join('');
        }
    }

    // Criação do HTML de uma tarefa
    createTaskHTML(task, type) {
        const todayOnlyIndicator = task.isTodayOnly ? '<span class="today-only-indicator"><i class="fas fa-calendar-day"></i> Hoje</span>' : '';
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox" data-task-id="${task.id}">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-content">
                    <div class="task-title">
                        ${task.title}
                        ${todayOnlyIndicator}
                    </div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-meta">
                        <span>Criado em: ${this.formatDateShort(task.createdAt)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-btn" onclick="event.stopPropagation(); app.showTaskDetails('${task.id}', '${type}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Criação do HTML de uma tarefa recorrente
    createRecurringTaskHTML(task) {
        const categoryLabels = {
            personal: 'Pessoal',
            work: 'Trabalho',
            health: 'Saúde',
            study: 'Estudo',
            other: 'Outro'
        };

        // Formatar dias da semana
        const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weekdaysText = task.weekdays && task.weekdays.length > 0 
            ? task.weekdays.map(day => weekdayNames[day]).join(', ')
            : 'Todos os dias';

        // Verificar se a tarefa está ativa hoje
        const localDate = this.getLocalDate();
        const currentWeekday = localDate.getDay();
        const isActiveToday = task.weekdays && task.weekdays.includes(currentWeekday);
        const activeClass = isActiveToday ? 'active-today' : '';

        return `
            <div class="task-item ${activeClass}" data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-title">
                        ${task.title}
                        ${isActiveToday ? '<span class="today-indicator"><i class="fas fa-star"></i></span>' : ''}
                    </div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-meta">
                        <span class="task-weekdays"><i class="fas fa-calendar-week"></i> ${weekdaysText}</span>
                        <span>Criado em: ${this.formatDateShort(task.createdAt)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-btn" onclick="event.stopPropagation(); app.showTaskDetails('${task.id}', 'recurring')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Criação do HTML de um item de tarefa para a tab "Tarefas"
    createTaskItemHTML(task) {
        if (task.isTodayOnly) {
            // Tarefa apenas para hoje
            return `
                <div class="task-item" data-task-id="${task.id}">
                    <div class="task-content">
                        <div class="task-title">
                            ${task.title}
                            <span class="today-only-indicator"><i class="fas fa-calendar-day"></i> Hoje</span>
                        </div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            <span><i class="fas fa-calendar-day"></i> Apenas para hoje</span>
                            <span>Criado em: ${this.formatDateShort(task.createdAt)}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn" onclick="event.stopPropagation(); app.showTaskDetails('${task.id}', 'today')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Tarefa recorrente
            return this.createRecurringTaskHTML(task);
        }
    }

    // Atualização do progresso de hoje
    updateTodayProgress() {
        const tasks = this.dailyTasks[this.currentDate] || [];
        const completedTasks = tasks.filter(task => task.completed).length;
        const totalTasks = tasks.length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Update progress ring
        const progressCircle = document.getElementById('progress-circle');
        const progressText = document.getElementById('progress-text');
        if (progressCircle && progressText) {
            const circumference = 2 * Math.PI * 54; // r = 54
            const offset = circumference - (percentage / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
            progressText.textContent = `${percentage}%`;
        }
    }

    // Alternar conclusão de tarefa
    toggleTaskCompletion(taskId) {
        const tasks = this.dailyTasks[this.currentDate];
        const task = tasks.find(t => t.id === taskId);
        
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? this.getLocalDate().toISOString() : null;
            
            this.saveData();
            this.updateTodayProgress();
            this.updateHistory();
            this.renderHistory();
            this.renderStats();
            this.updateTodayStats();
            
            // Update insights if on analytics tab
            if (this.currentTab === 'analytics') {
                this.renderInsights();
            }
            
            // Mostrar notificação de sucesso
            const status = task.completed ? 'concluída' : 'desmarcada';
            this.showNotification(`Tarefa ${status} com sucesso!`, 'success');
        }
    }

    // Controle do toggle de tipo de tarefa
    toggleTaskType() {
        const taskTypeToggle = document.getElementById('task-type-toggle');
        const recurringOptions = document.getElementById('recurring-options');
        
        if (taskTypeToggle.checked) {
            // Tarefa recorrente - mostrar opções de dias da semana
            recurringOptions.style.display = 'block';
        } else {
            // Tarefa para hoje - esconder opções de dias da semana
            recurringOptions.style.display = 'none';
        }
    }

    // Controle do toggle de tipo de tarefa no modal de edição
    toggleEditTaskType() {
        const editTaskTypeToggle = document.getElementById('edit-task-type-toggle');
        const editRecurringOptions = document.getElementById('edit-recurring-options');
        
        if (editTaskTypeToggle.checked) {
            // Tarefa recorrente - mostrar opções de dias da semana
            editRecurringOptions.style.display = 'block';
        } else {
            // Tarefa para hoje - esconder opções de dias da semana
            editRecurringOptions.style.display = 'none';
        }
    }

    // Adição de tarefa (recorrente ou para hoje)
    addTask() {
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const taskTypeToggle = document.getElementById('task-type-toggle');
        
        if (!title) {
            alert('Por favor, insira um título para a tarefa.');
            return;
        }

        if (taskTypeToggle.checked) {
            // Criar tarefa recorrente
            this.addRecurringTask(title, description);
        } else {
            // Criar tarefa para hoje
            this.addTodayTask(title, description);
        }
    }

    // Adição de tarefa recorrente
    addRecurringTask(title, description) {
        // Obter dias da semana selecionados
        const selectedWeekdays = [];
        for (let i = 0; i < 7; i++) {
            const checkbox = document.getElementById(`weekday-${i}`);
            if (checkbox && checkbox.checked) {
                selectedWeekdays.push(i);
            }
        }

        // Se nenhum dia foi selecionado, marcar todos os dias (comportamento padrão)
        if (selectedWeekdays.length === 0) {
            for (let i = 0; i < 7; i++) {
                selectedWeekdays.push(i);
            }
        }

        const newTask = {
            id: this.generateId(),
            title: title,
            description: description,
            weekdays: selectedWeekdays, // Array com os dias da semana (0=domingo, 1=segunda, etc.)
            createdAt: this.getLocalDate().toISOString()
        };

        this.recurringTasks.push(newTask);
        
        // Gerar tarefas para hoje se o dia atual estiver selecionado
        this.generateTodayTasks();
        
        this.saveData();
        this.updateHistory();
        this.renderRecurringTasks();
        this.renderTodayTasks();
        this.renderStats();
        this.updateTodayStats();
        
        this.hideAddTaskModal();
        this.showNotification('Tarefa recorrente criada com sucesso!', 'success');
    }

    // Adição de tarefa para hoje
    addTodayTask(title, description) {
        if (!this.dailyTasks[this.currentDate]) {
            this.dailyTasks[this.currentDate] = [];
        }

        const newTask = {
            id: this.generateId(),
            title: title,
            description: description,
            completed: false,
            createdAt: this.getLocalDate().toISOString(),
            isTodayOnly: true // Marca que é uma tarefa apenas para hoje
        };

        this.dailyTasks[this.currentDate].push(newTask);
        
        this.saveData();
        this.updateHistory();
        this.renderTodayTasks();
        this.renderRecurringTasks(); // Atualizar também a tab "Tarefas"
        this.renderStats();
        this.updateTodayStats();
        
        this.hideAddTaskModal();
        this.showNotification('Tarefa para hoje criada com sucesso!', 'success');
    }

    // Exclusão de tarefa recorrente
    deleteRecurringTask(taskId) {
        if (confirm('Tem certeza que deseja excluir esta tarefa recorrente? Isso também removerá todas as instâncias futuras.')) {
            // Remove from recurring tasks
            this.recurringTasks = this.recurringTasks.filter(task => task.id !== taskId);
            
            // Remove from today's tasks if it exists there
            if (this.dailyTasks[this.currentDate]) {
                this.dailyTasks[this.currentDate] = this.dailyTasks[this.currentDate].filter(task => task.id !== taskId);
            }
            
            this.saveData();
            this.renderRecurringTasks();
            
            // Regenerate today's tasks to ensure consistency
            this.generateTodayTasks();
            this.updateTodayProgress();
            this.updateHistory();
            this.renderTodayTasks();
            this.renderHistory();
            this.renderStats();
            this.updateTodayStats();
            
            // Update insights if on analytics tab
            if (this.currentTab === 'analytics') {
                this.renderInsights();
            }
            
            this.showNotification('Tarefa excluída com sucesso!', 'success');
        }
    }

    // Exclusão de tarefa para hoje
    deleteTodayTask(taskId) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            // Remove from today's tasks
            this.dailyTasks[this.currentDate] = this.dailyTasks[this.currentDate].filter(task => task.id !== taskId);
            this.saveData();
            this.updateTodayProgress();
            this.updateHistory();
            this.renderTodayTasks();
            this.renderRecurringTasks(); // Atualizar também a tab "Tarefas"
            this.renderHistory();
            this.renderStats();
            this.updateTodayStats();
            
            // Update insights if on analytics tab
            if (this.currentTab === 'analytics') {
                this.renderInsights();
            }
            
            this.showNotification('Tarefa excluída com sucesso!', 'success');
        }
    }

    // Exclusão da tarefa atual (no modal de detalhes)
    deleteCurrentTask() {
        const taskId = this.currentTaskId;
        const taskType = this.currentTaskType;

        if (taskType === 'recurring') {
            this.deleteRecurringTask(taskId);
        } else {
            this.deleteTodayTask(taskId);
        }

        this.hideTaskDetailsModal();
    }

    // Exibição do modal de adicionar tarefa
    showAddTaskModal() {
        document.getElementById('add-task-modal').classList.add('active');
        document.body.classList.add('modal-open');
        document.getElementById('task-title').focus();
        
        // Inicializar o toggle para "Para Hoje" (não marcado)
        const taskTypeToggle = document.getElementById('task-type-toggle');
        const recurringOptions = document.getElementById('recurring-options');
        if (taskTypeToggle) {
            taskTypeToggle.checked = false;
            recurringOptions.style.display = 'none';
        }
        
        // Marcar automaticamente o dia atual da semana (para quando for recorrente)
        const localDate = this.getLocalDate();
        const currentWeekday = localDate.getDay();
        const currentCheckbox = document.getElementById(`weekday-${currentWeekday}`);
        if (currentCheckbox) {
            currentCheckbox.checked = true;
        }
    }

    // Ocultação do modal de adicionar tarefa
    hideAddTaskModal() {
        document.getElementById('add-task-modal').classList.remove('active');
        document.body.classList.remove('modal-open');
        document.getElementById('add-task-form').reset();
    }

    // Exibição dos detalhes da tarefa
    showTaskDetails(taskId, type) {
        this.currentTaskId = taskId;
        this.currentTaskType = type;

        let task;
        if (type === 'recurring') {
            task = this.recurringTasks.find(t => t.id === taskId);
        } else {
            task = this.dailyTasks[this.currentDate].find(t => t.id === taskId);
        }

        if (task) {
            document.getElementById('task-details-title').textContent = task.title;
            
            const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            const weekdaysText = task.weekdays && task.weekdays.length > 0 
                ? task.weekdays.map(day => weekdayNames[day]).join(', ')
                : 'Todos os dias';
            
            const detailsContent = `
                <div class="task-details">
                    <p><strong>Título:</strong> ${task.title}</p>
                    ${task.description ? `<p><strong>Descrição:</strong> ${task.description}</p>` : ''}
                    <p><strong>Criado em:</strong> ${this.formatDate(task.createdAt)}</p>
                    ${type === 'recurring' ? `<p><strong>Repete em:</strong> ${weekdaysText}</p>` : ''}
                    ${task.isTodayOnly ? `<p><strong>Tipo:</strong> <span class="task-status active">Apenas para hoje</span></p>` : ''}
                </div>
            `;

            document.getElementById('task-details-content').innerHTML = detailsContent;
            
            // Show edit and delete buttons based on current tab
            const editBtn = document.getElementById('edit-task-btn');
            const deleteBtn = document.getElementById('delete-task-btn');
            
            if (editBtn) {
                // Hide edit button if we're on the "today" tab (except for today-only tasks)
                if (this.currentTab === 'today') {
                    editBtn.style.display = 'none';
                } else {
                    // Show edit button for recurring tasks and today-only tasks in other tabs
                    editBtn.style.display = 'inline-flex';
                }
            }
            
            if (deleteBtn) {
                // Hide delete button if we're on the "today" tab (except for today-only tasks)
                if (this.currentTab === 'today') {
                    deleteBtn.style.display = 'none';
                } else {
                    // Show delete button for recurring tasks and today-only tasks in other tabs
                    deleteBtn.style.display = 'inline-flex';
                }
            }

            document.getElementById('task-details-modal').classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    // Ocultação do modal de detalhes da tarefa
    hideTaskDetailsModal() {
        document.getElementById('task-details-modal').classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    // Exibição do modal de editar tarefa
    showEditTaskModal() {
        let task = this.recurringTasks.find(t => t.id === this.currentTaskId);
        let isTodayOnly = false;
        
        // Se não encontrou nas tarefas recorrentes, procurar nas tarefas de hoje
        if (!task && this.dailyTasks[this.currentDate]) {
            task = this.dailyTasks[this.currentDate].find(t => t.id === this.currentTaskId);
            isTodayOnly = task && task.isTodayOnly;
        }
        
        if (task) {
            // Preencher título e descrição
            document.getElementById('edit-task-title').value = task.title;
            document.getElementById('edit-task-description').value = task.description || '';
            
            // Configurar o toggle baseado no tipo da tarefa
            const editTaskTypeToggle = document.getElementById('edit-task-type-toggle');
            const editRecurringOptions = document.getElementById('edit-recurring-options');
            if (editTaskTypeToggle) {
                if (isTodayOnly) {
                    // Tarefa para hoje - toggle desmarcado
                    editTaskTypeToggle.checked = false;
                    editRecurringOptions.style.display = 'none';
                } else {
                    // Tarefa recorrente - toggle marcado
                    editRecurringOptions.style.display = 'block';
                    
                    // Preencher os checkboxes com os dias atuais
                    for (let i = 0; i < 7; i++) {
                        const checkbox = document.getElementById(`edit-weekday-${i}`);
                        if (checkbox) {
                            checkbox.checked = task.weekdays && task.weekdays.includes(i);
                        }
                    }
                }
                
                // Adicionar event listener para quando o toggle mudar
                editTaskTypeToggle.addEventListener('change', () => {
                    if (editTaskTypeToggle.checked && isTodayOnly) {
                        // Se está convertendo de "Para Hoje" para "Recorrente", marcar o dia atual
                        const localDate = this.getLocalDate();
                        const currentWeekday = localDate.getDay();
                        
                        // Marcar apenas o dia atual
                        for (let i = 0; i < 7; i++) {
                            const checkbox = document.getElementById(`edit-weekday-${i}`);
                            if (checkbox) {
                                checkbox.checked = (i === currentWeekday);
                            }
                        }
                    }
                });
            }
            
            document.getElementById('edit-task-modal').classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    // Ocultação do modal de editar tarefa
    hideEditTaskModal() {
        document.getElementById('edit-task-modal').classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    // Salvamento da edição da tarefa
    saveTaskEdit() {
        const taskId = this.currentTaskId;
        let task = this.recurringTasks.find(t => t.id === taskId);
        let isTodayOnly = false;
        
        // Se não encontrou nas tarefas recorrentes, procurar nas tarefas de hoje
        if (!task && this.dailyTasks[this.currentDate]) {
            task = this.dailyTasks[this.currentDate].find(t => t.id === taskId);
            isTodayOnly = task && task.isTodayOnly;
        }
        
        if (task) {
            // Obter título e descrição
            const title = document.getElementById('edit-task-title').value.trim();
            const description = document.getElementById('edit-task-description').value.trim();
            const editTaskTypeToggle = document.getElementById('edit-task-type-toggle');
            
            if (!title) {
                alert('Por favor, insira um título para a tarefa.');
                return;
            }
            
            if (editTaskTypeToggle.checked) {
                // Converter para ou manter como tarefa recorrente
                const selectedWeekdays = [];
                for (let i = 0; i < 7; i++) {
                    const checkbox = document.getElementById(`edit-weekday-${i}`);
                    if (checkbox && checkbox.checked) {
                        selectedWeekdays.push(i);
                    }
                }

                if (selectedWeekdays.length === 0) {
                    alert('Por favor, selecione pelo menos um dia da semana.');
                    return;
                }
                
                if (isTodayOnly) {
                    // Converter de "Para Hoje" para "Recorrente"
                    // Remover das tarefas de hoje
                    this.dailyTasks[this.currentDate] = this.dailyTasks[this.currentDate].filter(t => t.id !== taskId);
                    
                    // Adicionar às tarefas recorrentes
                    const recurringTask = {
                        id: taskId,
                        title: title,
                        description: description,
                        weekdays: selectedWeekdays,
                        createdAt: task.createdAt
                    };
                    this.recurringTasks.push(recurringTask);
                    
                    this.saveData();
                    this.hideEditTaskModal();
                    this.hideTaskDetailsModal();
                    this.renderRecurringTasks();
                    this.generateTodayTasks();
                    this.renderTodayTasks();
                    this.updateTodayStats();
                    
                    this.showNotification('Tarefa convertida para "Recorrente" com sucesso!', 'success');
                } else {
                    // Atualizar tarefa recorrente existente
                    task.title = title;
                    task.description = description;
                    task.weekdays = selectedWeekdays;
                    
                    this.saveData();
                    this.updateHistory();
                    this.hideEditTaskModal();
                    this.hideTaskDetailsModal();
                    this.renderRecurringTasks();
                    this.generateTodayTasks();
                    this.renderTodayTasks();
                    this.renderStats();
                    this.updateTodayStats();
                    
                    this.showNotification('Tarefa recorrente atualizada com sucesso!', 'success');
                }
            } else {
                // Manter como ou converter para tarefa para hoje
                if (isTodayOnly) {
                    // Atualizar tarefa para hoje existente
                    task.title = title;
                    task.description = description;
                    
                    this.saveData();
                    this.updateHistory();
                    this.hideEditTaskModal();
                    this.hideTaskDetailsModal();
                    this.renderRecurringTasks();
                    this.renderTodayTasks();
                    this.renderStats();
                    this.updateTodayStats();
                    
                    this.showNotification('Tarefa para hoje atualizada com sucesso!', 'success');
                } else {
                    // Converter de "Recorrente" para "Para Hoje"
                    // Remover da lista de tarefas recorrentes
                    this.recurringTasks = this.recurringTasks.filter(t => t.id !== taskId);
                    
                    // Verificar se já existe uma tarefa para hoje com este ID
                    if (!this.dailyTasks[this.currentDate]) {
                        this.dailyTasks[this.currentDate] = [];
                    }
                    
                    // Remover qualquer tarefa existente com o mesmo ID para evitar duplicação
                    this.dailyTasks[this.currentDate] = this.dailyTasks[this.currentDate].filter(t => t.id !== taskId);
                    
                    // Remover também qualquer tarefa que tenha o mesmo recurringTaskId
                    this.dailyTasks[this.currentDate] = this.dailyTasks[this.currentDate].filter(t => t.recurringTaskId !== taskId);
                    
                    // Adicionar como tarefa para hoje
                    const todayTask = {
                        id: taskId,
                        title: title,
                        description: description,
                        completed: false,
                        createdAt: task.createdAt,
                        isTodayOnly: true
                    };
                    
                    this.dailyTasks[this.currentDate].push(todayTask);
                    
                    this.saveData();
                    this.updateHistory();
                    this.hideEditTaskModal();
                    this.hideTaskDetailsModal();
                    
                    // Regenerar tarefas de hoje para garantir consistência
                    this.generateTodayTasks();
                    
                    // Renderizar na ordem correta para evitar duplicações
                    this.renderTodayTasks();
                    this.renderRecurringTasks();
                    this.renderStats();
                    this.updateTodayStats();
                    
                    this.showNotification('Tarefa convertida para "Para Hoje" com sucesso!', 'success');
                }
            }
        }
    }

    // Exibição de notificações
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Hide and remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Renderização do histórico
    renderHistory(filter = '7days') {
        // Garantir que a data atual esteja correta antes de renderizar histórico
        this.updateCurrentDate();
        const container = document.getElementById('history-container');
        const last7Days = this.getLast7Days();
        
        let filteredDays = last7Days;
        if (filter === '30days') {
            filteredDays = this.getLastNDays(30);
        } else if (filter === '90days') {
            filteredDays = this.getLastNDays(90);
        }

        // Filter out days with no tasks
        const daysWithTasks = filteredDays.filter(date => {
            const dayTasks = this.dailyTasks[date] || [];
            return dayTasks.length > 0;
        });

        if (daysWithTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Nenhum histórico de atividades encontrado para este período.</p>
                </div>
            `;
            return;
        }

        const historyHTML = daysWithTasks.map(date => {
            const dayTasks = this.dailyTasks[date] || [];
            const completedTasks = dayTasks.filter(task => task.completed).length;
            const totalTasks = dayTasks.length;
            const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Get progress color based on percentage
            let progressColor = 'var(--text-secondary)';
            let progressClass = '';
            if (percentage >= 80) {
                progressColor = 'var(--success-color)';
                progressClass = 'success';
            } else if (percentage >= 50) {
                progressColor = 'var(--warning-color)';
                progressClass = 'warning';
            } else if (percentage > 0) {
                progressColor = 'var(--danger-color)';
                progressClass = 'danger';
            }

            return `
                <div class="history-day">
                    <div class="history-date">
                        <i class="fas fa-calendar-day"></i>
                        ${this.formatHistoryDate(date)}
                    </div>
                    <div class="history-progress ${progressClass}" style="--progress-color: ${progressColor};">
                        ${totalTasks} tarefas • ${completedTasks} concluídas • ${percentage}% de progresso
                    </div>
                    <div class="history-tasks">
                        ${dayTasks.map(task => `
                            <div class="history-task ${task.completed ? 'completed' : ''}">
                                <i class="fas fa-${task.completed ? 'check' : 'circle'}"></i>
                                ${task.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = historyHTML;
    }

    // Obter os últimos N dias
    getLastNDays(n) {
        const dates = [];
        const localDate = this.getLocalDate();
        
        for (let i = n - 1; i >= 0; i--) {
            // Usar uma abordagem mais robusta para calcular datas passadas
            const date = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate() - i);
            const dateString = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0');
            dates.push(dateString);
        }
        
        return dates;
    }

    // Obter os últimos 7 dias
    getLast7Days() {
        return this.getLastNDays(7);
    }

    // Atualização do histórico
    updateHistory() {
        const tasks = this.dailyTasks[this.currentDate] || [];
        const completedTasks = tasks.filter(task => task.completed).length;
        const totalTasks = tasks.length;
        
        this.history[this.currentDate] = {
            total: totalTasks,
            completed: completedTasks,
            percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            tasks: tasks
        };
        
        this.saveData();
    }

    // Formatação de data
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('pt-BR', options);
    }

    // Formatação de data curta
    formatDateShort(dateString) {
        const date = new Date(dateString);
        const options = { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        };
        return date.toLocaleDateString('pt-BR', options);
    }

    // Renderização das estatísticas
    renderStats() {
        const stats = this.calculateStats(this.getLast7Days());
        document.getElementById('avg-completion').textContent = `${stats.avgCompletion}%`;
        document.getElementById('streak-days').textContent = stats.streakDays;
        document.getElementById('total-tasks').textContent = stats.totalTasks;
        // Update best day
        const bestDay = this.calculateBestDay();
        document.getElementById('best-day').textContent = bestDay;

        // --- NOVO: preencher trends dinâmicos ---
        // 1. Trend de conclusão (% a mais ou a menos em relação à semana anterior)
        const last7 = this.getLast7Days();
        const prev7 = this.getLastNDays(14).slice(7, 14); // Corrigido: pegar os 7 dias anteriores (dias 8-14)
        const avgLast7 = this.calculateStats(last7).avgCompletion;
        const avgPrev7 = this.calculateStats(prev7).avgCompletion;
        
        let trendCompletion = 0;
        let trendCompletionText = '';
        let trendCompletionClass = '';
        
        if (avgPrev7 > 0) {
            trendCompletion = avgLast7 - avgPrev7;
            
            // Se a média atual é alta (70%+), considerar como boa performance mesmo com pequenas variações
            if (avgLast7 >= 70) {
                if (trendCompletion >= 5) {
                    trendCompletionText = 'Excelente!';
                    trendCompletionClass = 'excellent';
                } else if (trendCompletion >= 0) {
                    trendCompletionText = 'Muito Bom';
                    trendCompletionClass = 'good';
                } else if (trendCompletion >= -3) {
                    trendCompletionText = 'Bom';
                    trendCompletionClass = 'good';
                } else {
                    trendCompletionText = 'Leve Queda';
                    trendCompletionClass = 'warning';
                }
            } else {
                // Lógica original para médias mais baixas
                if (trendCompletion >= 20) {
                    trendCompletionText = 'Excelente!';
                    trendCompletionClass = 'excellent';
                } else if (trendCompletion >= 10) {
                    trendCompletionText = 'Muito Bom';
                    trendCompletionClass = 'good';
                } else if (trendCompletion >= 5) {
                    trendCompletionText = 'Bom';
                    trendCompletionClass = 'good';
                } else if (trendCompletion > 0) {
                    trendCompletionText = 'Melhorou';
                    trendCompletionClass = 'good';
                } else if (trendCompletion >= -1) {
                    trendCompletionText = 'Estável';
                    trendCompletionClass = 'stable';
                } else if (trendCompletion >= -8) {
                    trendCompletionText = 'Leve Queda';
                    trendCompletionClass = 'warning';
                } else if (trendCompletion >= -15) {
                    trendCompletionText = 'Precisa Melhorar';
                    trendCompletionClass = 'warning';
                } else {
                    trendCompletionText = 'Atenção';
                    trendCompletionClass = 'danger';
                }
            }
        } else if (avgLast7 > 0) {
            if (avgLast7 >= 80) {
                trendCompletionText = 'Excelente!';
                trendCompletionClass = 'excellent';
            } else if (avgLast7 >= 70) {
                trendCompletionText = 'Muito Bom';
                trendCompletionClass = 'good';
            } else if (avgLast7 >= 50) {
                trendCompletionText = 'Bom';
                trendCompletionClass = 'good';
            } else if (avgLast7 >= 30) {
                trendCompletionText = 'Estável';
                trendCompletionClass = 'stable';
            } else {
                trendCompletionText = 'Começando';
                trendCompletionClass = 'stable';
            }
        } else {
            trendCompletionText = 'Sem dados';
            trendCompletionClass = 'neutral';
        }
        
        // TEMPORÁRIO: Criar dados de teste se não houver dados suficientes
        if (Object.keys(this.history).length < 5) {
            this.createTestData();
            // Recalcular após criar dados de teste
            const newAvgLast7 = this.calculateStats(last7).avgCompletion;
            const newAvgPrev7 = this.calculateStats(prev7).avgCompletion;
            
            if (newAvgPrev7 > 0) {
                const newTrendCompletion = newAvgLast7 - newAvgPrev7;
                
                // Se a média atual é alta (70%+), considerar como boa performance mesmo com pequenas variações
                if (newAvgLast7 >= 70) {
                    if (newTrendCompletion >= 5) {
                        trendCompletionText = 'Excelente!';
                        trendCompletionClass = 'excellent';
                    } else if (newTrendCompletion >= 0) {
                        trendCompletionText = 'Muito Bom';
                        trendCompletionClass = 'good';
                    } else if (newTrendCompletion >= -3) {
                        trendCompletionText = 'Bom';
                        trendCompletionClass = 'good';
                    } else {
                        trendCompletionText = 'Leve Queda';
                        trendCompletionClass = 'warning';
                    }
                } else {
                    // Lógica original para médias mais baixas
                    if (newTrendCompletion >= 20) {
                        trendCompletionText = 'Excelente!';
                        trendCompletionClass = 'excellent';
                    } else if (newTrendCompletion >= 10) {
                        trendCompletionText = 'Muito Bom';
                        trendCompletionClass = 'good';
                    } else if (newTrendCompletion >= 5) {
                        trendCompletionText = 'Bom';
                        trendCompletionClass = 'good';
                    } else if (newTrendCompletion > 0) {
                        trendCompletionText = 'Melhorou';
                        trendCompletionClass = 'good';
                    } else if (newTrendCompletion >= -1) {
                        trendCompletionText = 'Estável';
                        trendCompletionClass = 'stable';
                    } else if (newTrendCompletion >= -8) {
                        trendCompletionText = 'Leve Queda';
                        trendCompletionClass = 'warning';
                    } else if (newTrendCompletion >= -15) {
                        trendCompletionText = 'Precisa Melhorar';
                        trendCompletionClass = 'warning';
                    } else {
                        trendCompletionText = 'Atenção';
                        trendCompletionClass = 'danger';
                    }
                }
            }
        }
        
        const elTrendCompletion = document.getElementById('trend-completion');
        if (elTrendCompletion) {
            elTrendCompletion.textContent = trendCompletionText;
            elTrendCompletion.className = `trend-${trendCompletionClass}`;
        }

        // 2. Trend de streak (maior streak dos últimos 14 dias)
        const streakLast7 = this.calculateStats(last7).streakDays;
        const streakPrev7 = this.calculateStats(prev7).streakDays;
        let trendStreakText = '';
        let trendStreakClass = '';
        
        if (streakLast7 > streakPrev7) {
            const diff = streakLast7 - streakPrev7;
            if (diff >= 3) {
                trendStreakText = 'Excelente!';
                trendStreakClass = 'excellent';
            } else if (diff >= 2) {
                trendStreakText = 'Muito Bom';
                trendStreakClass = 'good';
            } else {
                trendStreakText = 'Melhorou';
                trendStreakClass = 'good';
            }
        } else if (streakLast7 < streakPrev7) {
            const diff = streakPrev7 - streakLast7;
            if (diff >= 3) {
                trendStreakText = 'Atenção';
                trendStreakClass = 'danger';
            } else if (diff >= 2) {
                trendStreakText = 'Precisa Melhorar';
                trendStreakClass = 'warning';
            } else {
                trendStreakText = 'Leve Queda';
                trendStreakClass = 'warning';
            }
        } else {
            if (streakLast7 >= 5) {
                trendStreakText = 'Consistente';
                trendStreakClass = 'excellent';
            } else if (streakLast7 >= 3) {
                trendStreakText = 'Estável';
                trendStreakClass = 'good';
            } else {
                trendStreakText = 'Estável';
                trendStreakClass = 'stable';
            }
        }
        
        const elTrendStreak = document.getElementById('trend-streak');
        if (elTrendStreak) {
            elTrendStreak.textContent = trendStreakText;
            elTrendStreak.className = `trend-${trendStreakClass}`;
        }

        // 3. Trend de total de tarefas (quantas tarefas a mais esta semana)
        const totalLast7 = this.calculateStats(last7).totalTasks;
        const totalPrev7 = this.calculateStats(prev7).totalTasks;
        let trendTotalText = '';
        let trendTotalClass = '';
        
        if (totalPrev7 > 0) {
            const diff = totalLast7 - totalPrev7;
            if (diff >= 10) {
                trendTotalText = 'Muito Produtivo';
                trendTotalClass = 'excellent';
            } else if (diff >= 5) {
                trendTotalText = 'Produtivo';
                trendTotalClass = 'good';
            } else if (diff > 0) {
                trendTotalText = 'Aumentou';
                trendTotalClass = 'good';
            } else if (diff === 0) {
                trendTotalText = 'Estável';
                trendTotalClass = 'stable';
            } else if (diff >= -5) {
                trendTotalText = 'Leve Queda';
                trendTotalClass = 'warning';
            } else {
                trendTotalText = 'Precisa Melhorar';
                trendTotalClass = 'danger';
            }
        } else if (totalLast7 > 0) {
            if (totalLast7 >= 20) {
                trendTotalText = 'Muito Produtivo';
                trendTotalClass = 'excellent';
            } else if (totalLast7 >= 10) {
                trendTotalText = 'Produtivo';
                trendTotalClass = 'good';
            } else {
                trendTotalText = 'Começando';
                trendTotalClass = 'stable';
            }
        } else {
            trendTotalText = 'Sem dados';
            trendTotalClass = 'neutral';
        }
        
        const elTrendTotal = document.getElementById('trend-total');
        if (elTrendTotal) {
            elTrendTotal.textContent = trendTotalText;
            elTrendTotal.className = `trend-${trendTotalClass}`;
        }

        // 4. Trend do melhor dia (média de conclusão do melhor dia)
        // Vamos pegar o melhor dia e calcular a média de conclusão dele nos últimos 7 dias
        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        let bestDayIndex = weekdayNames.indexOf(bestDay);
        if (bestDayIndex === -1) bestDayIndex = 0;
        let bestDaySum = 0;
        let bestDayCount = 0;
        last7.forEach(date => {
            const d = new Date(date);
            if (d.getDay() === bestDayIndex) {
                const dayData = this.history[date];
                if (dayData && dayData.total > 0) {
                    bestDaySum += dayData.percentage;
                    bestDayCount++;
                }
            }
        });
        const bestDayAvg = bestDayCount > 0 ? Math.round(bestDaySum / bestDayCount) : 0;
        const elTrendBestDay = document.getElementById('trend-bestday');
        if (elTrendBestDay) elTrendBestDay.textContent = bestDayAvg > 0 ? `${bestDayAvg}% de conclusão` : 'Sem dados';
    }

    // Cálculo das estatísticas
    calculateStats(dates) {
        let totalCompletion = 0;
        let totalTasks = 0;
        let streakDays = 0;
        let currentStreak = 0;
        let daysWithData = 0;

        dates.forEach(date => {
            const dayData = this.history[date];
            if (dayData && dayData.total > 0) {
                totalCompletion += dayData.percentage;
                totalTasks += dayData.total;
                daysWithData++;
                
                if (dayData.percentage >= 80) { // Consider 80%+ as a good day
                    currentStreak++;
                    streakDays = Math.max(streakDays, currentStreak);
                } else {
                    currentStreak = 0;
                }
            } else {
                currentStreak = 0;
            }
        });

        const avgCompletion = daysWithData > 0 ? Math.round(totalCompletion / daysWithData) : 0;

        return {
            avgCompletion,
            totalTasks,
            streakDays
        };
    }

    // Cálculo do melhor dia
    calculateBestDay() {
        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const weekdayStats = [0, 0, 0, 0, 0, 0, 0]; // [dom, seg, ter, qua, qui, sex, sab]
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

        Object.keys(this.history).forEach(date => {
            const dayData = this.history[date];
            if (dayData && dayData.total > 0) {
                // Usar a data local para calcular o dia da semana
                const dateParts = date.split('-');
                const localDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                const dayOfWeek = localDate.getDay();
                
                weekdayStats[dayOfWeek] += dayData.percentage;
                weekdayCounts[dayOfWeek]++;
            }
        });

        let bestDay = 0;
        let bestAvg = 0;

        weekdayStats.forEach((total, index) => {
            if (weekdayCounts[index] > 0) {
                const avg = total / weekdayCounts[index];
                if (avg > bestAvg) {
                    bestAvg = avg;
                    bestDay = index;
                }
            }
        });

        return weekdayNames[bestDay];
    }

    // Mudança do período do gráfico
    changeChartPeriod(period) {
        this.currentChartPeriod = period;
        this.renderChart();
    }

    // Obter datas por período
    getDatesByPeriod(period) {
        const localDate = this.getLocalDate();
        const dates = [];

        switch (period) {
            case '7days':
                for (let i = 6; i >= 0; i--) {
                    // Usar uma abordagem mais robusta para calcular datas passadas
                    const date = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate() - i);
                    dates.push(this.formatDateForChart(date));
                }
                break;
            case 'month':
                const monthStart = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
                const monthEnd = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
                for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                    dates.push(this.formatDateForChart(new Date(d)));
                }
                break;
            case 'year':
                for (let month = 0; month < 12; month++) {
                    const date = new Date(localDate.getFullYear(), month, 1);
                    dates.push(this.formatDateForChart(date));
                }
                break;
        }

        return dates;
    }

    // Formatação de data para gráfico
    formatDateForChart(date) {
        return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
    }

    // Cálculo de estatísticas por período
    calculateStatsByPeriod(dates, period) {
        const stats = [];

        if (period === '7days') {
            dates.forEach(date => {
                const dayData = this.history[date];
                stats.push({
                    date: date,
                    value: dayData ? dayData.percentage : 0,
                    label: this.formatChartLabel(date)
                });
            });
        } else if (period === 'month') {
            // Group by week
            const weeklyStats = [];
            for (let i = 0; i < dates.length; i += 7) {
                const weekDates = dates.slice(i, i + 7);
                let weekTotal = 0;
                let weekCount = 0;

                weekDates.forEach(date => {
                    const dayData = this.history[date];
                    if (dayData) {
                        weekTotal += dayData.percentage;
                        weekCount++;
                    }
                });

                weeklyStats.push({
                    date: weekDates[0],
                    value: weekCount > 0 ? Math.round(weekTotal / weekCount) : 0,
                    label: `Semana ${Math.floor(i / 7) + 1}`
                });
            }
            stats.push(...weeklyStats);
        } else if (period === 'year') {
            dates.forEach(date => {
                const monthData = this.getMonthData(date);
                stats.push({
                    date: date,
                    value: monthData.avgCompletion,
                    label: this.formatChartLabel(date)
                });
            });
        }

        return stats;
    }

    // Obter dados do mês
    getMonthData(monthStart) {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        let totalCompletion = 0;
        let dayCount = 0;

        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dateString = this.formatDateForChart(d);
            const dayData = this.history[dateString];
            if (dayData) {
                totalCompletion += dayData.percentage;
                dayCount++;
            }
        }

        return {
            avgCompletion: dayCount > 0 ? Math.round(totalCompletion / dayCount) : 0
        };
    }

    // Renderização do gráfico
    renderChart() {
        // Garantir que a data atual esteja correta antes de renderizar o gráfico
        this.updateCurrentDate();
        
        const canvas = document.getElementById('progress-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dates = this.getDatesByPeriod(this.currentChartPeriod);
        const stats = this.calculateStatsByPeriod(dates, this.currentChartPeriod);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (stats.length === 0) return;

        // Responsive canvas sizing
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Set canvas size based on container and device
        const isMobile = window.innerWidth <= 768;
        const canvasWidth = isMobile ? Math.max(600, containerWidth) : containerWidth;
        const canvasHeight = isMobile ? 200 : containerHeight;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const maxValue = Math.max(...stats.map(s => s.value));
        const barWidth = canvasWidth / stats.length;
        const maxBarHeight = canvasHeight - 80; // Leave space for labels
        const barSpacing = isMobile ? barWidth * 0.3 : barWidth * 0.2;
        const actualBarWidth = barWidth - barSpacing;

        // Draw bars
        stats.forEach((stat, index) => {
            const x = index * barWidth + barWidth / 2;
            const barHeight = maxValue > 0 ? (stat.value / maxValue) * maxBarHeight : 0;
            const y = canvasHeight - 60 - barHeight;

            // Bar gradient
            const gradient = ctx.createLinearGradient(x - actualBarWidth/2, y, x - actualBarWidth/2, canvasHeight - 60);
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#818cf8');

            ctx.fillStyle = gradient;
            ctx.fillRect(x - actualBarWidth/2, y, actualBarWidth, barHeight);

            // Add hover effect (rounded corners)
            ctx.save();
            ctx.beginPath();
            
            // Fallback for roundRect if not supported
            if (ctx.roundRect) {
                ctx.roundRect(x - actualBarWidth/2, y, actualBarWidth, barHeight, 4);
            } else {
                // Manual rounded rectangle
                const radius = 4;
                const left = x - actualBarWidth/2;
                const top = y;
                const right = left + actualBarWidth;
                const bottom = top + barHeight;
                
                ctx.moveTo(left + radius, top);
                ctx.lineTo(right - radius, top);
                ctx.quadraticCurveTo(right, top, right, top + radius);
                ctx.lineTo(right, bottom - radius);
                ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
                ctx.lineTo(left + radius, bottom);
                ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
                ctx.lineTo(left, top + radius);
                ctx.quadraticCurveTo(left, top, left + radius, top);
            }
            
            ctx.clip();
            ctx.fillStyle = gradient;
            ctx.fillRect(x - actualBarWidth/2, y, actualBarWidth, barHeight);
            ctx.restore();

            // Value label
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
            ctx.font = isMobile ? '10px Inter' : '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`${stat.value}%`, x, y - 10);

            // Date label
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
            ctx.font = isMobile ? '8px Inter' : '10px Inter';
            const label = this.formatChartLabel(stat.date);
            ctx.fillText(label, x, canvasHeight - 20);
        });

        // Add grid lines for better readability
        this.drawChartGrid(ctx, canvasWidth, canvasHeight, maxValue);
    }

    // Draw grid lines for the chart
    drawChartGrid(ctx, width, height, maxValue) {
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Horizontal grid lines
        const gridLines = 5;
        for (let i = 1; i < gridLines; i++) {
            const y = height - 60 - (i * (height - 80) / gridLines);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    // Formatação do label do gráfico
    formatChartLabel(dateString) {
        // Parse a data string no formato YYYY-MM-DD
        const dateParts = dateString.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Mês é 0-indexed
        const day = parseInt(dateParts[2]);
        
        // Criar data local
        const date = new Date(year, month, day);
        const isMobile = window.innerWidth <= 768;
        
        if (this.currentChartPeriod === '7days') {
            if (isMobile) {
                // Short format for mobile: "15/07"
                return date.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit' 
                });
            } else {
                // Full format for desktop: "15 jul"
                return date.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'short' 
                });
            }
        } else if (this.currentChartPeriod === 'month') {
            if (isMobile) {
                // Short format for mobile: "S1", "S2", etc.
                const weekNumber = Math.ceil(date.getDate() / 7);
                return `S${weekNumber}`;
            } else {
                // Full format for desktop: "Semana 1"
                const weekNumber = Math.ceil(date.getDate() / 7);
                return `Semana ${weekNumber}`;
            }
        } else if (this.currentChartPeriod === 'year') {
            if (isMobile) {
                // Short format for mobile: "Jan", "Fev", etc.
                return date.toLocaleDateString('pt-BR', { 
                    month: 'short' 
                });
            } else {
                // Full format for desktop: "Janeiro"
                return date.toLocaleDateString('pt-BR', { 
                    month: 'long' 
                });
            }
        }
        
        return date.toLocaleDateString('pt-BR', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Configuração do PWA
    setupPWA() {
        // Detectar mudanças na conectividade
        window.addEventListener('online', () => {
            this.updateOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.updateOnlineStatus();
        });

        this.updateOnlineStatus();
    }

    // Atualização do status online
    updateOnlineStatus() {
        const statusElement = document.getElementById('online-status');
        if (statusElement) {
            if (navigator.onLine) {
                statusElement.style.display = 'none';
            } else {
                statusElement.style.display = 'flex';
            }
        }
    }

    // Formatação de data para histórico
    formatHistoryDate(dateString) {
        // Parse a data string no formato YYYY-MM-DD
        const dateParts = dateString.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Mês é 0-indexed
        const day = parseInt(dateParts[2]);
        
        // Criar data local
        const date = new Date(year, month, day);
        const localDate = this.getLocalDate();
        
        // Calcular ontem de forma mais robusta
        const yesterday = new Date(localDate);
        yesterday.setDate(localDate.getDate() - 1);

        // Comparar componentes de data diretamente
        const isToday = date.getFullYear() === localDate.getFullYear() &&
                       date.getMonth() === localDate.getMonth() &&
                       date.getDate() === localDate.getDate();
                       
        const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
                           date.getMonth() === yesterday.getMonth() &&
                           date.getDate() === yesterday.getDate();

        if (isToday) {
            return 'Hoje';
        } else if (isYesterday) {
            return 'Ontem';
        } else {
            const options = { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
            };
            return date.toLocaleDateString('pt-BR', options);
        }
    }

    // Obter data local correta
    getLocalDate() {
        const now = new Date();
        return new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    }

    // Atualizar a data atual
    updateCurrentDate() {
        const localDate = this.getLocalDate();
        this.currentDate = localDate.getFullYear() + '-' +
            String(localDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(localDate.getDate()).padStart(2, '0');
    }

    // Notas - Exibir modal de nota
    showAddNoteModal() {
        document.getElementById('add-note-modal').classList.add('active');
        document.body.classList.add('modal-open');
        document.getElementById('note-title').focus();
    }

    hideAddNoteModal() {
        document.getElementById('add-note-modal').classList.remove('active');
        document.body.classList.remove('modal-open');
        document.getElementById('add-note-form').reset();
    }

    // Adicionar nota
    addNote() {
        const title = document.getElementById('note-title').value.trim();
        const content = document.getElementById('note-content').value.trim();
        if (!title || !content) {
            alert('Preencha o título e o conteúdo da nota.');
            return;
        }
        const newNote = {
            id: this.generateId(),
            title,
            content,
            createdAt: this.getLocalDate().toISOString()
        };
        this.notes.unshift(newNote);
        this.saveNotes();
        this.renderNotes();
        this.hideAddNoteModal();
        this.showNotification('Nota criada com sucesso!', 'success');
    }

    // Renderizar notas
    renderNotes() {
        const container = document.getElementById('notes-container');
        const emptyState = document.getElementById('notes-empty');
        if (!this.notes.length) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        emptyState.style.display = 'none';
        container.innerHTML = this.notes.map(note => `
            <div class="note-item">
                <div class="note-header">
                    <div class="note-title">${note.title}</div>
                    <div class="note-actions">
                        <button class="edit-note-btn" data-note-id="${note.id}" title="Editar nota">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-note-btn" data-note-id="${note.id}" title="Excluir nota">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">${note.content.replace(/\n/g, '<br>')}</div>
                <div class="note-meta">${this.formatDateShort(note.createdAt)}</div>
            </div>
        `).join('');
    }

    // Excluir nota
    deleteNote(noteId) {
        if (confirm('Deseja realmente excluir esta nota?')) {
            this.notes = this.notes.filter(n => n.id !== noteId);
            this.saveNotes();
            this.renderNotes();
            this.showNotification('Nota excluída!', 'success');
        }
    }

    // TEMPORÁRIO: Criar dados de teste para demonstrar as tendências
    createTestData() {
        const localDate = this.getLocalDate();
        
        // Criar dados para os últimos 14 dias com tendência de melhoria
        for (let i = 13; i >= 0; i--) {
            const date = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate() - i);
            const dateString = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0');
            
            // Primeira semana (dias 8-14): performance baixa
            // Segunda semana (dias 1-7): performance melhorando
            let percentage, total, completed;
            
            if (i >= 7) {
                // Semana anterior: performance baixa (30-50%)
                percentage = 30 + Math.floor(Math.random() * 20);
                total = 5 + Math.floor(Math.random() * 3);
            } else {
                // Semana atual: performance melhorando (60-90%)
                percentage = 60 + Math.floor(Math.random() * 30);
                total = 6 + Math.floor(Math.random() * 4);
            }
            
            completed = Math.round((percentage / 100) * total);
            
            this.history[dateString] = {
                total: total,
                completed: completed,
                percentage: percentage,
                tasks: []
            };
        }
        
        this.saveData();
    }

    // Exibir modal de editar nota
    showEditNoteModal(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            this.currentEditingNoteId = noteId;
            document.getElementById('edit-note-title').value = note.title;
            document.getElementById('edit-note-content').value = note.content;
            document.getElementById('edit-note-modal').classList.add('active');
            document.body.classList.add('modal-open');
            document.getElementById('edit-note-title').focus();
        }
    }

    hideEditNoteModal() {
        document.getElementById('edit-note-modal').classList.remove('active');
        document.body.classList.remove('modal-open');
        document.getElementById('edit-note-form').reset();
        this.currentEditingNoteId = null;
    }

    // Salvar edição da nota
    saveNoteEdit() {
        const title = document.getElementById('edit-note-title').value.trim();
        const content = document.getElementById('edit-note-content').value.trim();
        
        if (!title || !content) {
            alert('Preencha o título e o conteúdo da nota.');
            return;
        }

        const noteIndex = this.notes.findIndex(n => n.id === this.currentEditingNoteId);
        if (noteIndex !== -1) {
            this.notes[noteIndex].title = title;
            this.notes[noteIndex].content = content;
            this.notes[noteIndex].updatedAt = this.getLocalDate().toISOString();
            
            this.saveNotes();
            this.renderNotes();
            this.hideEditNoteModal();
            this.showNotification('Nota atualizada com sucesso!', 'success');
        }
    }
}

// Inicialização do aplicativo

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Verifica se há uma nova versão
      reg.onupdatefound = () => {
        const newWorker = reg.installing;
        newWorker.onstatechange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Alerta visual simples
            const updateBanner = document.createElement('div');
            updateBanner.innerHTML = `
              <div style="position:fixed;bottom:0;left:0;right:0;background:#222;color:white;padding:12px;text-align:center;z-index:9999;">
                Nova versão disponível. <button id="refreshApp" style="margin-left:8px;padding:6px 12px;">Atualizar</button>
              </div>
            `;
            document.body.appendChild(updateBanner);
            document.getElementById('refreshApp').addEventListener('click', () => {
              newWorker.postMessage({ action: 'skipWaiting' });
            });
          }
        };
      };
    });
  
    // Força a ativação imediata do novo SW
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });
  }
  
const app = new DailyTodoApp(); 