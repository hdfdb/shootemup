var data = {
    counter: 0,
    difficulty: 750,            // Default difficulty value.
    graph: new GameGraph(),     // The generator of random graphs.
    current: {                  // The player current score and stats.
        damage: {},
        killAllWaves: {},
        surviveWaves: {}
    },
    wave: -1,                   // The number of waves on the screen, as to not overlay them.
};

// Helper functions.
var createButton = function () {

};

var generatePlayer = function (stats, game) {
    // Calculating the number of lives according to damage.
    var getLivesCount = function (value) {
        if (value > 0) {
            return Math.floor((value * 0.9) / 100);
        } else {
            return 3;
        }
    };

    // Choosing starting weapon according to the number of kills.
    var getWeapon = function (value) {
        if (value <= 0 || value > 0.75) {
            return 'SINGLEBULLET';
        } else if (value > 0.50) {
            return 'THREEWAY';
        } else if (value > 0.25) {
            return 'ROCKETS';
        } else {
            return 'SPLITSHOT';
        }
    };

    var weapon = createWeapon(getWeapon(stats.kills.total), game, true);
    return new Player(game, 100, 370, weapon, getLivesCount(stats.damage));
}

// Creating the game canvas.
var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'game');

var StartingMenu = {
    preload: function () {
        game.load.image('play', 'assets/spaceship.png');
    },

    create: function () {
        var startGame = function () {
            // Change the state to the actual game.
            stateText.visible = false;
            this.state.start('Game');
        };

        // Add a button to start the game
        var button = this.add.button(0, 0, 'play', startGame, this);
        button.width = 800;
        button.height = 600;

        // Add a text to the button
        var stateText = game.add.text(game.world.centerX, game.world.centerY, ' ', {
            font: '84px Arial',
            fill: '#FF0000'
        });
        stateText.anchor.setTo(0.5, 0.5);

        stateText.text = "Click to play !";
        stateText.visible = true;
    }
};

var Game = {
    preload: function () {
        // Background
        game.load.image('starfield', 'assets/starfield.png');

        // Player Ship
        game.load.image('ship', 'assets/thrust_ship.png');

        // Enemies' Ships
        game.load.image('invader', 'assets/invader.png');
        game.load.image('invader2', 'assets/enemy1.png');
        game.load.image('boss', 'assets/enemy.png');

        // Explosions
        game.load.spritesheet('kaboom', 'assets/explode.png', 128, 128);

        // Bonuses
        game.load.image('TokenLife', 'assets/life.png');
        game.load.image('TokenHealth', 'assets/health.png');
        game.load.image('TokenShield', 'assets/shield.png');
        game.load.image('TokenWeapon', 'assets/weapon.png');

        // Bullets
        for (let i = 0; i <= 11; i++) {
            game.load.image('bullet' + i, 'assets/bullet' + i + '.png');
        }
    },

    create: function () {
        game.world.setBounds(0, 0, 800, 600);
        data.background = game.add.tileSprite(0, 0, 800, 600, 'starfield');

        // Retrieve stats on player and creating its player profile accordingly.
        data.stats = getPlayerStats();
        data.player = generatePlayer(data.stats, game);

        // Creating player ship.
        game.add.existing(data.player);
        game.physics.enable(data.player, Phaser.Physics.ARCADE);

        // Adding limits to avoid the player ship leaving the screen.
        data.player.body.collideWorldBounds = true;

        // Creating a level depending on the requested difficulty
        data.level = data.graph.generateValidGraph(game, data.difficulty);
        console.log(data.level);
        var rootNode = data.level.getRoot();
        var rootValue = rootNode.getValue();

        // Editing to the actual calculated difficulty value.
        data.difficulty = calculateNode(rootNode);

        // Detecting keyboard entries.
        data.cursors = game.input.keyboard.createCursorKeys();
        game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR, Phaser.Keyboard.P]);

        // Creating a group for enemies.
        data.enemies = game.add.group();
        data.enemies.enableBody = true;
        data.enemies.physicsBodyType = Phaser.Physics.ARCADE;

        // Creating a group for explosions.
        data.explosions = game.add.group();
        data.explosions.createMultiple(30, 'kaboom');
        data.explosions.forEach(setupInvader, this);

        // Creating a group for tokens.
        data.tokens = game.add.group();
        data.tokens.enableBody = true;

        //Initialisation de la div #info
        initInfos("GAME STARTED", "green");
    },

    update: function () {
        data.counter++;
        if (data.counter % 50 === 0) {
            //console.log("round: " + counter);
            if (LevelEngine.loadLevel(data.level)) {
                var time = new Date(game.time.now - game.time.pauseDuration);
                data.current.score = LevelEngine.calculateScore();
                //On affiche le temps nécéssaire à la réussite du niveau et le score
                initInfos("LEVEL FINISHED ! CONGRATULATIONS !<br/>Time: " + time.getUTCMinutes() + ":" + time.getUTCSeconds() + '<br/> Score : ' + data.current.score, "green");

                updateStats(data.player);
                //on lance le menu de niveau réussi
                game.state.start('CompleteMenu', true, false);

            }
            //Si le joueur n'a plus de vie
            if (data.player.getLife() === 0) {
                initInfos("NO MORE LIVES ! GAME LOST !", "red");
                //On lance le menu Game over
                game.state.start('GameOverMenu', true, false);
            }
        }

        //Réinitialisation du compteur de vague pour remmettre les enemies sur
        //le bord droit de la fenetre
        if (data.wave > -1) {
            data.isAllDead = true;
            data.enemies.forEach(isAllDeadEnnemies, this);
            if (data.isAllDead) {
                //Si tous les enemies de la liste sont "mort", on réinitialise le compteur de vagues
                data.wave = -1;
            }
        }
        //on fait défilier le fond
        data.background.tilePosition.x -= 2;

        //On gére les différentes collisions
        game.physics.arcade.overlap(data.player, data.enemies, playerCollisionHandler, null, this);
        game.physics.arcade.overlap(data.player.weapon, data.enemies, bulletsCollisionHandler, null, this);
        game.physics.arcade.overlap(data.player, data.tokens, tokenCollisionHandler, null, this);

        //on réinitialise la vitesse du vaisseau
        // -> pas de touches enfoncées le vaisseau s'arréte
        data.player.body.velocity.set(0);

        //Suivant les touches enfoncées par le joueur on met à jour le déplacement du vaisseau
        if (data.cursors.left.isDown) {
            data.player.body.velocity.x = -data.player.speed;
        } else if (data.cursors.right.isDown) {
            data.player.body.velocity.x = data.player.speed;
        }

        if (data.cursors.up.isDown) {
            data.player.body.velocity.y = -data.player.speed;
        } else if (data.cursors.down.isDown) {
            data.player.body.velocity.y = data.player.speed;
        }

        //si le joueur appuie sur "espace", il tire des balles
        if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
            data.player.weapon.fire(data.player, true);
        }

        // If player presses P, the game is un/paused.
        if (game.input.keyboard.isDown(Phaser.Keyboard.P)) {
            // to do ^^
        }

        data.enemies.forEachAlive(function (enemy) {
            if (enemy.exists) {
                if (enemy.firstAppreance) {
                    //Si l'ennemi apparait pour la premiére fois, il ne tire pas tout de suite
                    enemy.firstAppear();
                } else {
                    //Sinon il bombarde !!!!!
                    enemy.weapon.fire(enemy, false);
                    //on ajoute la detection de collisions entre les balles de l'enemis et le joueur
                    //Le tir amis pour les ennemis n'est pas pris en compte
                    game.physics.arcade.overlap(enemy.weapon, data.player, playerCollisionHandler, null, this);
                }
            }
        });
    }
}

var CompleteMenu = {
    preload: function () {
        game.load.image('play', 'assets/spaceship.png');
    },

    create: function () {
        var restartGame = function () {
            // We change the difficulty for the next level
            data.difficulty *= 1.2;
            this.state.start('Game');
        };

        // Add a button to start the game
        var button = this.add.button(0, 0, 'play', restartGame, this);
        button.width = 800;
        button.height = 600;

        // Add a text to the button
        var stateText = game.add.text(game.world.centerX, game.world.centerY, ' ', {
            font: '84px Arial',
            fill: '#FF0000'
        });
        stateText.anchor.setTo(0.5, 0.5);

        stateText.text = "CONGRATULATIONS\n Click to play another one !";
        stateText.visible = true;
    }
};

var GameOverMenu = {
    preload: function () {
        game.load.image('play', 'assets/spaceship.png');
    },

    create: function () {
        var restartGame = function () {
            // We change the difficulty for the next level
            data.difficulty *= 0.8;
            this.state.start('Game');
        };

        // Add a button to restart the game
        var button = this.add.button(0, 0, 'play', restartGame, this);
        button.width = 800;
        button.height = 600;

        // Add a text to the button
        var stateText = game.add.text(game.world.centerX, game.world.centerY, ' ', {
            font: '84px Arial',
            fill: '#FF0000'
        });
        stateText.anchor.setTo(0.5, 0.5);

        stateText.text = "GAME OVER\n Click to play another one !";
        stateText.visible = true;
    }
};

// Adding the game states to the game.
game.state.add('StartingMenu', StartingMenu);
game.state.add('Game', Game);
game.state.add('CompleteMenu', CompleteMenu);
game.state.add('GameOverMenu', GameOverMenu);

// Starting the game with the starting menu.
game.state.start('StartingMenu');


var surviveDamage = 0;
var killAllSuccess = 0;
var killAllTotal = 0;
var surviveSuccess = 0;
var surviveTotal = 0;

//Fonction pour initialiser les écritures d'objectifs
function initInfos(text, color = "black") {
    $("#info").html(text);
    $("#info").css("color", color);
}

//Fonction pour modifier les objectifs en cours
function writeInfos(text, color = "black") {
    if ($("#info").html() !== "") {
        $("#info").html($("#info").html() + " " + text);
    } else {
        $("#info").html(text);
    }

    $("#info").css("color", color);
}


function setupInvader(invader) {
    //pour chaque enemi créer on lui ajoute l'animation d'explosion
    invader.anchor.x = 0.5;
    invader.anchor.y = 0.5;
    invader.animations.add('kaboom');
}


function isAllDeadEnnemies(enemy) {
    //fonction qui test si les enemies de la liste "enemies" sont mort ou sortie de la fenetre
    if (enemy.posX > 0 && enemy.life > 0) {
        //s'il y en a qui est encore vivant on passe le booléen isAllDead a false
        isAllDead = false;
    }
}


/****************
 ** COLLISION
 ****************/
// Handler for collision between bullet and enemy
function bulletsCollisionHandler(bullet, enemy) {
    // Bullet destroyed and calculate damage
    bullet.kill();
    enemy.life -= bullet.damage;

    // If no more life
    if (enemy.life <= 0) {
        // KABOOM
        var explosion = data.explosions.getFirstExists(false);
        explosion.reset(enemy.body.x, enemy.body.y);
        explosion.play('kaboom', 30, false, true);
        // And remove enemy.
        enemy.kill();

        // Increment kill counter in player stats.
        data.current.kills++;

        // Random generation of token when an enemy dies, with a 5% chance.
        if (game.rnd.integerInRange(0, 100) > 95) {
            createToken(data.graph.generateRndToken(game), enemy.body.x, enemy.body.y);
        }
    }
}

// Handler for the collision between player and enemy ships.
function playerCollisionHandler(player, enemy) {
    // Damage to player and counting in stats.
    player.lifeBar.changeLife(-enemy.damage);
    data.current.damage.survived += enemy.damage;

    // KABOOM
    var explosion = data.explosions.getFirstExists(false);
    explosion.reset(enemy.body.x, enemy.body.y);
    explosion.play('kaboom', 30, false, true);

    // And remove enemy.
    enemy.life = 0;
    enemy.kill();
}

// Handler for the collision between player and tokens.
function tokenCollisionHandler(player, token) {
    token.useToken(player);
    token.kill();
}

/****************
 ** STATISTICS
 ****************/
var getPlayerStats = function () {
    var stats = localStorage.getItem('shootemup.stats');
    if (stats !== null) {
        return $.parseJSON(stats);
    } else {
        stats = {
            totalGames: 0,
            bestScore: 0,
            timePlayed: 0,
            damage: {done: 0, survived: 0},
            deaths: 0,
            kills: 0,
            killAllWaves: {time: 0, success: 0, total: 0},
            surviveWaves: {damage: 0, success: 0, total: 0}
        };
        return stats;
    }
};

var updateStats = function () {
    data.stats['totalGames']++;
    data.stats['score']['best'] = (data.current.score > data.stats['bestScore'] ? data.current.score : data.stats['bestScore']);
    data.stats['score']['total'] += data.current.score;
    data.stats['timePlayed'] += game.time.now;
    data.stats['damage']['done'] += data.current.damage.done;
    data.stats['damage']['survived'] += data.current.damage.survived;
    data.stats['deaths'] += data.current.deaths;
    data.stats['kills'] += data.current.kills;
    data.stats['killAllWaves']['time'] = data.current.killAllWaves.time;
    data.stats['killAllWaves']['success'] = data.current.killAllWaves.success;
    data.stats['killAllWaves']['total'] = data.current.killAllWaves.total;
    data.stats['surviveWaves']['damage'] += data.current.surviveWaves.damage;
    data.stats['surviveWaves']['success'] += data.current.surviveWaves.success;
    data.stats['surviveWaves']['total'] += data.current.surviveWaves.total;
    saveStats();
};

var saveStats = function (stats) {
    localStorage.setItem('shootemup.stats', $.json(stats));
};