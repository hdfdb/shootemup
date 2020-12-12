var LevelEngine = {

    loadLevel: function (level) {
        console.log(level);
        var rootNode = level.getRoot();
        var rootValue = rootNode.getValue();
        if (rootValue.statut === undefined) rootValue.statut = false;
        return this.loadNode(rootNode);
    },

    loadNode: function (node) {
        //console.log(node);
        var value = node.getValue();

        // If the objective is successful, return true.
        if (this.isObjectiveFulfill(node)) return true;

        // If it's not a leaf, checking operators.
        if (!this.isLeaf(node)) {
            if (value.type === "ET//" || value.type === "OU//") {
                //console.log("node: ET// or OU//");
                // Si le statut est indéfini, le noeud n'est pas encore chargé, on le fait
                if (value.statut === undefined) {
                    this.loadParallelNode(node);
                }
            } else if (value.type === "ET" || value.type === "OU") {
                //console.log("node: ET/OU");
                var children = node.getNeighbors();
                while (children.hasNextNode()) {
                    var currentChild = children.getNextNode();
                    var currentChildValue = currentChild.getValue();
                    //console.log("statut child: " + currentChildValue.statut);

                    //si on est en attente du statut du noeud
                    if (this.isWaiting(currentChildValue)) {
                        //console.log("node: waiting");
                        //console.log(currentChild);
                        //On vérifie si l'objectif a été réalisé
                        if (this.isObjectiveFulfill(currentChild)) {
                            currentChildValue.statut = true;
                        }

                        if (!this.isLeaf(currentChild)) {
                            this.loadNode(currentChild);
                        }

                        return;
                    } else if (currentChildValue.statut === undefined) {
                        //si le noeud n'est pas encore chargé

                        //console.log("node: undefined");
                        //console.log(currentChild);
                        initInfos("");
                        if (this.isLeaf(currentChild)) {
                            currentChildValue.statut = false;
                            //console.log("congrats, it's a leaf !!!!!!!");
                            this.loadLeaf(currentChild);
                        } else {
                            //console.log("bouh, it's a node...");
                            this.loadNode(currentChild);
                            currentChildValue.statut = false;
                        }
                        //console.log("return, node :");
                        //console.log(node);
                        //console.log("return, children :");
                        //console.log(currentChild);
                        return;
                    }
                }
            }
        } else {
            initInfos("");
            this.loadLeaf(node);
        }

        return false;
    },

    loadLeaf: function (node) {
        var value = node.getValue();
        //console.log("loadLeaf");
        //console.log(node);
        //console.log(value);
        if (value.objective === "survive") {
            //console.log("createLeafSurvive");
            //console.log(node);
            node.startDamage = data.current.damage.done;
            data.current.surviveWaves.total++;
            data.wave++;
            value.enemies = this.createSurviveWave(value.vague);
            //On met à jour les objectifs
            writeInfos("Survive Wave of " + value.vague.numberEnemy + " enemies.");
        } else if (value.objective === "kill_all") {
            //console.log("createLeafKillAll");
            //console.log(node);
            node.startTime = game.time.now;
            data.current.killAllWaves.total++;
            data.wave++;
            value.enemies = this.createKillAllWave(value.vague);
            //on met à jour les objectifs
            writeInfos("Kill all " + value.vague.numberEnemy + " enemies.");
        } else if (value.objective === "get_token") {
            //console.log("createLeafToken");
            //console.log(node);
            value.thetoken = createToken(value.token);
            //on met à jour les objectifs
            writeInfos("Pick up " + value.token.type.toLowerCase() + " token.");
        }
        //On met le statut de la feuille à faux -> objectif par encore réalisé
        value.statut = false;
    },

    isLeaf: function (node) {
        return (node.getDegree() === 0);
    },

    isWaiting: function (nodeValue) {
        return (nodeValue.statut !== undefined && !nodeValue.statut);
    },

    isTrue: function (nodeValue) {
        return (nodeValue.statut !== undefined && nodeValue.statut);
    },

    isObjectiveFulfill: function (node) {
        if (this.isLeaf(node)) {
            //console.log("isObjectiveFulfill : isLeaf");
            return this.isObjectiveLeafFulfill(node);
        } else {
            //console.log("isObjectiveFulfill : isNode");
            return this.isObjectiveNodeFulfill(node);
        }
    },

    isObjectiveNodeFulfill: function (node) {
        //On vérifie si l'objectif à été réalisé
        var value = node.getValue();
        if (this.isTrue(value)) return true;
        if (value === undefined) return false;

        if (this.isWaiting(value)) {
            //console.log("isObjectiveNodeFulfill : isWaiting");
            if (value.type === "ET//" || value.type === "ET") {
                //console.log("isObjectiveNodeFulfill : ET");
                var children = node.getNeighbors();
                while (children.hasNextNode()) {
                    var currentChild = children.getNextNode();
                    if (!this.isObjectiveFulfill(currentChild)) {
                        //console.log("!isObjectiveFulfill");
                        return false;
                    }
                }

                return (value.statut = true);
            } else if (value.type === "OU//" || value.type === "OU") {
                //console.log("isObjectiveNodeFulfill : OU");
                var nbTrue = 0;
                var children = node.getNeighbors();
                while (children.hasNextNode()) {
                    var currentChild = children.getNextNode();
                    var currentChildValue = currentChild.getValue();
                    if (currentChildValue.statut === undefined) {
                        //console.log("!isObjectiveNodeFulfill");
                        return false;
                    } else if (this.isObjectiveFulfill(currentChild)) {
                        nbTrue++;
                    }
                    /*if (nbTrue > 0) console.log("isObjectiveNodeFulfill");
                    else console.log("!isObjectiveNodeFulfill"); */

                    return (currentChildValue.statut = (nbTrue > 0));
                }
            }
        }
    },

    isObjectiveLeafFulfill: function (leaf) {
        var value = leaf.getValue();
        if (this.isTrue(value)) return true;
        if (value.statut === undefined) return false;

        if (value.objective === "kill_all" || value.objective === "survive") {
            value.statut = this.areAllDeadOrGone(leaf);
            if (value.statut) {
                if (value.objective === "kill_all") {
                    var timeToClear = game.time.now - leaf.startTime;
                    data.current.killAllWaves.time = (data.current.killAllWaves.time + timeToClear) / 2;
                    data.current.killAllWaves.success++;
                } else if (value.objective = "survive") {
                    var damageDiff = data.current.damage.done - leaf.startDamage;
                    data.current.surviveWaves.damage = (data.current.surviveWaves.damage + damageDiff) / 2;
                    data.current.surviveWaves.success++;
                }
            }
            return value.statut;
        } else if (value.objective === "get_token") {
            /* if (value.thetoken !== undefined && !value.thetoken.exists && !value.thetoken.visible) console.log("isObjectiveLeafFulfill : get_token");
            else console.log("!isObjectiveLeafFulfill : get_token"); */

            return (value.statut = (value.thetoken !== undefined && !value.thetoken.exists && !value.thetoken.visible));
        }
    },

    loadParallelNode: function (node) {
        initInfos("", "black");
        var children = node.getNeighbors();
        //console.log(children);
        while (children.hasNextNode()) {
            var currentChild = children.getNextNode();
            var currentChildValue = currentChild.getValue();
            //console.log(currentChild);
            if (this.isLeaf(currentChild)) {
                //console.log("isLeaf");
                this.loadLeaf(currentChild);
            } else {
                //console.log("isNode");
                this.loadNode(currentChild);
            }
        }
    },

    areAllDeadOrGone: function (leaf) {
        //on test si l'objectif de la feuille est réaliser
        var vagueEnemies = leaf.getValue().enemies;
        //console.log(leaf);
        for (var i = 0; i < vagueEnemies.length; i++) {
            //console.log(vagueEnemies[i]);
            //s'ils ont encore de la vie et q'ils sont encore sur la fenetre de jeu
            //c'est qu'ils ne sont pas encore mort
            if (vagueEnemies[i].position.x > 0 && vagueEnemies[i].life > 0) {
                //console.log('!isObjectiveLeafFulfill : survive or kill all');
                return false;
            }
        }
        //console.log('isObjectiveLeafFulfill : survive or kill all');
        return true;
    },

    createKillAllWave: function (vague) {
        //On créé une vague de type KillAll
        //console.log("createKillAllWave : " + vague.numberEnemy + " enemies.")

        //variable de sauvegarde de la vague
        var vagueEnemies = [];
        //attribution de x selon le nombre de vagues déjà à l'écran
        var positionX = 750 - data.wave * 50;
        //Repartition selon l'axe Y
        var posYInc = Math.floor(600 / (vague.numberEnemy + 1));
        for (var i = 0; i < vague.numberEnemy; i++) {
            var invader = new Enemy.Invader(game, positionX, (i + 1) * posYInc, vague.life, vague.speed, vague.type, vague.weapon);
            invader.start();
            data.enemies.add(invader);
            vagueEnemies[i] = invader;
        }
        return vagueEnemies;
    },

    createSurviveWave: function (vague) {
        //On créé une vague de type "Survive"
        //console.log("createSurviveWave : " + vague.numberEnemy + " enemies.")
        //on stock chaque enemis dans une variable pour pouvoir savoir quand la vague n'existe plus
        var vagueEnemies = [];
        //On attribut la positionX selon le nombre de vagues déjà à l'écran
        var positionX = 800 + data.wave * 50;
        //On répartit les enemis sur l'axe Y
        var posYInc = Math.floor(600 / (vague.numberEnemy + 1));
        for (var i = 0; i < vague.numberEnemy; i++) {
            //on créer chaque enemis
            var invader = new Enemy.Invader(game, positionX, (i + 1) * posYInc, vague.life, vague.speed, vague.type, vague.weapon);
            //on les initialise sur la fenetre de jeu
            invader.start();
            //on les ajoute dans le groupe d'ennemis
            data.enemies.add(invader);
            //on leur donne une vitesse -> Vague Survive
            invader.body.velocity.set(-invader.speed, 0);
            //on les stock dans une variable annexe pour connaitre le statut de cette vague
            vagueEnemies[i] = invader;
        }
        return vagueEnemies;
    },

    calculateScore: function () {
        //Methode de calcul du score du joueur
        //En fonction de la difficulté de l'arbre
        var difficultyCoeff = calculateNode(data.level.getRoot()) / 150;
        //son ration d'enemis tués
        var killScore = (data.current.kills / data.enemies.length) * 1500;
        //Les dommages qu'il a reçu pendant la partie
        var lifeScore = -(data.current.damage.done * 2);
        //Le temps de jeu
        var timeScore = 100000000 / game.time.now;
        return Math.round(difficultyCoeff * (killScore + lifeScore + timeScore));
    }
}