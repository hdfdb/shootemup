var createToken = function (token, posX, posY) {
    //On créé le bonus du joueur
    var thetoken;
    //On lui attribut une position aléatoire sur l'écran
    var posX = posX || Math.floor((Math.random() * 700) + 50);
    var posY = posY || Math.floor((Math.random() * 500) + 50);

    if (token.type === "weapon") {
        //console.log("createWeaponToken");
        thetoken = new Token.Weapon(game, posX, posY, createWeapon(token.value, game, true));
    } else if (token.type === "shield") {
        //console.log("createShieldToken");
        thetoken = new Token.Shield(game, posX, posY, token.value);
    } else if (token.type === "health") {
        //console.log("createHealthToken");
        thetoken = new Token.Health(game, posX, posY, token.value);
    } else if (token.type === "life") {
        //console.log("createLifeToken");
        thetoken = new Token.Life(game, posX, posY);
    }
    //on ajoute le bonus au groupe
    data.tokens.add(thetoken);
    //On lui attribut sa postion
    thetoken.reset(posX, posY);
    /*var deleteToken = function(token) {
        token.kill();
    }
    this.game.time.events.add(Phaser.Timer.SECOND * 15, deleteToken, this, thetoken);*/
    return thetoken;
};

var Token = {};

///////////////////////////////////////////////
///      TOKEN LIFE -> GIVE +1 LIFE        ////
///////////////////////////////////////////////

Token.Life = function (game, posX, posY) {
    Phaser.Sprite.call(this, game, posX, posY, 'TokenLife');

    this.exists = false;
    this.visible = false;
}

Token.Life.prototype = Object.create(Phaser.Sprite.prototype);
Token.Life.prototype.constructor = Token.Life;

Token.Life.prototype.useToken = function (player) {
    //On ajoute une vie au joueur
    player.addLife();
};

///////////////////////////////////////////////
///    TOKEN HEALTH -> FILL HEALTH BAR     ////
///////////////////////////////////////////////


Token.Health = function (game, posX, posY) {
    Phaser.Sprite.call(this, game, posX, posY, 'TokenHealth');

    this.exists = false;
    this.visible = false;
}

Token.Health.prototype = Object.create(Phaser.Sprite.prototype);
Token.Health.prototype.constructor = Token.Health;

Token.Health.prototype.useToken = function (player) {
    //On remplit complétement la barre de vie du joueur
    player.setLife(player.lifeBar.getFullHealthValue());

};

///////////////////////////////////////////////
////     TOKEN SHIELD -> GIVE A SHIELD     ////
///////////////////////////////////////////////

Token.Shield = function (game, posX, posY, shield) {
    Phaser.Sprite.call(this, game, posX, posY, 'TokenShield');
    //shield comprit entre 0 et 1
    //On le multiplie à la santé max du joueur
    this.shield = shield;
    this.exists = false;
    this.visible = false;
}

Token.Shield.prototype = Object.create(Phaser.Sprite.prototype);
Token.Shield.prototype.constructor = Token.Shield;

Token.Shield.prototype.useToken = function (player) {
    //on ajoute un bouclier au joueur
    //(S'il en a déjà un, la valeur s'additionne)
    player.setShield(player.getShield() + player.lifeBar.getFullHealthValue() * this.shield);

};

///////////////////////////////////////////////
//// TOKEN WEAPON -> CHANGE PLAYER WEAPON  ////
///////////////////////////////////////////////

Token.Weapon = function (game, posX, posY, weapon) {
    Phaser.Sprite.call(this, game, posX, posY, 'TokenWeapon');

    this.weapon = weapon;
    this.exists = false;
    this.visible = false;

}

Token.Weapon.prototype = Object.create(Phaser.Sprite.prototype);
Token.Weapon.prototype.constructor = Token.Weapon;

Token.Weapon.prototype.useToken = function (player) {

    //Un token d'arme change l'arme du joueur pour un temps limité
    //on sauvegarde l'ancienne pour pouvoir lui redonner après
    var oldWeapon = player.weapon;
    player.weapon = this.weapon;

    var resetWeapon = function (player, oldWeapon) {
        player.weapon = oldWeapon
    };
    //Ajoute un evenement pour redonner l'ancienne arme au joueur après 6 SEC
    this.game.time.events.add(Phaser.Timer.SECOND * 6, resetWeapon, this, player, oldWeapon);

};
