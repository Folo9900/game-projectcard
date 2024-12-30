class BattleSystem {
    constructor(game) {
        this.game = game;
        this.currentBattle = null;
        this.playerMana = 0;
        this.maxMana = 0;
        this.playerHp = 30;
        this.opponentHp = 30;
        this.isPlayerTurn = true;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('end-turn').addEventListener('click', () => this.endTurn());
        document.getElementById('surrender').addEventListener('click', () => this.endBattle(true));
    }

    startBattle(opponent) {
        this.currentBattle = {
            opponent: opponent,
            turn: 1
        };
        
        this.playerHp = 30;
        this.opponentHp = 30;
        this.maxMana = 1;
        this.playerMana = 1;
        this.isPlayerTurn = true;
        
        this.updateBattleUI();
        document.getElementById('battle-modal').style.display = 'block';
        
        // Раздаем начальные карты
        this.dealInitialCards();
    }

    dealInitialCards() {
        // Случайным образом выбираем 3 карты из колоды игрока
        const playerDeck = this.game.playerInventory.slice();
        const initialHand = [];
        
        for(let i = 0; i < 3; i++) {
            if(playerDeck.length > 0) {
                const randomIndex = Math.floor(Math.random() * playerDeck.length);
                initialHand.push(playerDeck.splice(randomIndex, 1)[0]);
            }
        }
        
        this.renderPlayerHand(initialHand);
    }

    renderPlayerHand(cards) {
        const handContainer = document.getElementById('player-hand');
        handContainer.innerHTML = '';
        
        cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            cardElement.draggable = true;
            cardElement.addEventListener('dragstart', (e) => this.handleDragStart(e, card));
            handContainer.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.rarity || ''}`;
        cardElement.innerHTML = `
            <div class="mana-cost">${card.manaCost || 1}</div>
            <div class="card-name">${card.type.name}</div>
            <div class="card-effect">${card.effect || ''}</div>
            <div class="power">${card.type.power}</div>
        `;
        return cardElement;
    }

    handleDragStart(e, card) {
        if(!this.isPlayerTurn || this.playerMana < (card.manaCost || 1)) {
            e.preventDefault();
            return;
        }
        
        e.dataTransfer.setData('text/plain', JSON.stringify(card));
    }

    playCard(card, position) {
        if(!this.isPlayerTurn || this.playerMana < (card.manaCost || 1)) {
            return false;
        }
        
        // Уменьшаем ману
        this.playerMana -= (card.manaCost || 1);
        
        // Добавляем карту на поле
        const boardContainer = document.getElementById('player-board');
        const cardElement = this.createCardElement(card);
        boardContainer.appendChild(cardElement);
        
        // Применяем эффекты карты
        this.applyCardEffects(card);
        
        // Обновляем UI
        this.updateBattleUI();
        
        return true;
    }

    applyCardEffects(card) {
        // Здесь будет логика применения эффектов карты
        if(card.effect) {
            switch(card.effect.type) {
                case 'damage':
                    this.opponentHp -= card.effect.value;
                    this.createBattleAnimation('damage', card.effect.value);
                    break;
                case 'heal':
                    this.playerHp = Math.min(30, this.playerHp + card.effect.value);
                    this.createBattleAnimation('heal', card.effect.value);
                    break;
                // Добавьте другие эффекты здесь
            }
        }
    }

    createBattleAnimation(type, value) {
        const effectsContainer = document.querySelector('.battle-effects');
        const effect = document.createElement('div');
        effect.className = `battle-effect ${type}`;
        effect.textContent = value;
        effectsContainer.appendChild(effect);
        
        // Удаляем эффект после анимации
        setTimeout(() => effect.remove(), 1000);
    }

    endTurn() {
        this.isPlayerTurn = !this.isPlayerTurn;
        
        if(this.isPlayerTurn) {
            // Начало хода игрока
            this.maxMana = Math.min(10, this.maxMana + 1);
            this.playerMana = this.maxMana;
            this.drawCard();
        } else {
            // Ход противника
            setTimeout(() => this.playOpponentTurn(), 1000);
        }
        
        this.updateBattleUI();
    }

    drawCard() {
        if(this.game.playerInventory.length > 0) {
            const randomIndex = Math.floor(Math.random() * this.game.playerInventory.length);
            const card = this.game.playerInventory[randomIndex];
            const handContainer = document.getElementById('player-hand');
            const cardElement = this.createCardElement(card);
            handContainer.appendChild(cardElement);
        }
    }

    playOpponentTurn() {
        // Простая ИИ логика для противника
        // В будущем можно сделать более сложной
        const damage = Math.floor(Math.random() * 5) + 1;
        this.playerHp -= damage;
        this.createBattleAnimation('damage', damage);
        
        this.updateBattleUI();
        
        // Проверяем условие победы
        if(this.playerHp <= 0) {
            this.endBattle(false);
        } else {
            setTimeout(() => this.endTurn(), 1000);
        }
    }

    updateBattleUI() {
        document.getElementById('player-hp').textContent = this.playerHp;
        document.getElementById('opponent-hp').textContent = this.opponentHp;
        document.getElementById('mana-count').textContent = this.playerMana;
        document.getElementById('max-mana').textContent = this.maxMana;
        
        // Обновляем кристаллы маны
        const manaBar = document.getElementById('mana-bar');
        manaBar.innerHTML = '';
        for(let i = 0; i < this.maxMana; i++) {
            const crystal = document.createElement('div');
            crystal.className = `mana-crystal ${i < this.playerMana ? 'active' : ''}`;
            manaBar.appendChild(crystal);
        }
    }

    endBattle(surrendered = false) {
        const winner = surrendered ? 'opponent' : 
                      this.playerHp <= 0 ? 'opponent' : 
                      this.opponentHp <= 0 ? 'player' : null;
        
        if(winner === 'player') {
            this.game.playerLevel++;
            // Награждаем игрока
            this.giveReward();
        }
        
        document.getElementById('battle-modal').style.display = 'none';
        this.currentBattle = null;
    }

    giveReward() {
        // Создаем новую случайную карту как награду
        const newCard = this.game.generateRandomCard(true); // true для повышенного шанса редкой карты
        this.game.playerInventory.push(newCard);
        this.game.showNotification(`Получена новая карта: ${newCard.type.name}!`);
    }
}
