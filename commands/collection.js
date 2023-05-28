const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const mariadb = require('mariadb');

const {
    dbAddress,
    dbPort,
    dbUser,
    dbPassword,
    dbDatabase
} = require('../config.json');

const pool = mariadb.createPool({
    host: dbAddress,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
    connectionLimit: 5
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('collection')
        .setDescription('Base command for managing your collection')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('init')
                .setDescription('Creates a new collection table')
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('delete')
                .setDescription('Deletes your collection permanently')
        )
        .addSubcommandGroup((group) =>
            group
                .setName('card')
                .setDescription(
                    'Manages adding and removing cards from the collection'
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('add')
                        .setDescription('Adds a card to the collection')
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('The name of the card')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('set')
                                .setDescription(
                                    'The set name or code of the card'
                                )
                                .setRequired(true)
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('foil')
                                .setDescription(
                                    'Whether or not the card is foil (default false)'
                                )
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('token')
                                .setDescription(
                                    'Whether the card is a token (default false)'
                                )
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('count')
                                .setDescription(
                                    'How many of the card to add (default 1)'
                                )
                        )
                        .addStringOption((option) =>
                            option
                                .setName('location')
                                .setDescription(
                                    'Location the card is for organization (default none)'
                                )
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('remove')
                        .setDescription('Removes a card from the collection')
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('The name of the card')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('set')
                                .setDescription(
                                    'The set name or code of the card'
                                )
                                .setRequired(true)
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('foil')
                                .setDescription(
                                    'Whether or not the card is foil (default false)'
                                )
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('token')
                                .setDescription(
                                    'Whether the card is a token (default false)'
                                )
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('count')
                                .setDescription(
                                    'How many of the card to remove (default 1)'
                                )
                        )
                        .addStringOption((option) =>
                            option
                                .setName('location')
                                .setDescription(
                                    'Location the card is for organization (default none)'
                                )
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('move')
                        .setDescription(
                            'Moves a card from one location to another'
                        )
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('The name of the card')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('set')
                                .setDescription(
                                    'The set name or code of the card'
                                )
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('newlocation')
                                .setDescription(
                                    "New location of the card ('null' for no location)"
                                )
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('oldlocation')
                                .setDescription(
                                    'Old location of the card (default none)'
                                )
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('foil')
                                .setDescription(
                                    'Whether or not the card is foil (default false)'
                                )
                        )
                        .addBooleanOption((option) =>
                            option
                                .setName('token')
                                .setDescription(
                                    'Whether the card is a token (default false)'
                                )
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName('count')
                                .setDescription(
                                    'How many of the card to move (default 1)'
                                )
                        )
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();
        const user = interaction.user;
        await interaction.deferReply({ ephemeral: true });

        const tableExists = await hasTable(user.id);
        if (group === 'card') {
            if (!tableExists) {
                interaction.editReply(
                    'You do not have a collection started. Run `/collection init` to start one'
                );
                return;
            }

            if (subcommand === 'add') {
                addCardToCollection(interaction);
            }
            if (subcommand === 'remove') {
                deleteCardFromCollection(interaction);
            }
        } else if (group === null) {
            if (subcommand === 'init') {
                initCollection(interaction);
            } else if (subcommand === 'delete') {
                deleteCollection(interaction);
            }
        }
    }
};

async function initCollection(interaction) {
    const user = interaction.user;
    const tableExists = await hasTable(user.id);

    if (tableExists) {
        interaction.editReply('You already have an existing collection');
    } else {
        createTable(user.id)
            .then(() => {
                interaction.editReply('Your collection has been created');
            })
            .catch((err) => {
                interaction.editReply(
                    'An error occurred creating your collection'
                );
                console.log(err);
            });
    }
}

async function deleteCollection(interaction) {
    const user = interaction.user;
    const tableExists = await hasTable(user.id);

    if (!tableExists) {
        interaction.editReply('You do not have a collection to delete');
    } else {
        const embed = createDeleteEmbed();
        const buttons = createConfirmationButtons(user.id);
        interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });

        setTimeout(() => {
            interaction.fetchReply().then((reply) => {
                if (reply.embeds[0].data.title === 'Are you sure?') {
                    const newEmbed = createTimeoutDeleteEmbed();
                    const newButtons = createDisabledConfirmationButtons(
                        user.id
                    );
                    interaction.editReply({
                        embeds: [newEmbed],
                        components: [newButtons]
                    });
                }
            });
        }, 15000);
    }
}

async function addCardToCollection(interaction) {
    const cardName = interaction.options.getString('name');
    const cardSet = interaction.options.getString('set');
    const isFoil =
        interaction.options.getBoolean('foil') === true ? true : false;
    const isToken =
        interaction.options.getBoolean('token') === true ? true : false;
    const count =
        interaction.options.getInteger('count') === null
            ? 1
            : interaction.options.getInteger('count');
    const location = interaction.options.getString('location');
    const user = interaction.user;

    const set = await isValidSet(cardSet);
    if (set === false) {
        interaction.editReply(`Could not find set \`${cardSet}\``);
        return;
    }
    const cards = await getCards(cardName, set, isToken);

    if (cards.length === 0) {
        interaction.editReply(
            `Could not find \`${cardName}\` in set \`${cardSet}\``
        );
        return;
    }

    if (cards.length === 1) {
        const card = cards[0];
        const valid = await validateCard(interaction, card);
        if (!valid) {
            return;
        }
        addCard(user.id, card.uuid, isFoil, count, location)
            .then(() => {
                interaction.editReply('Card added');
            })
            .catch((err) => {
                interaction.editReply('An error occurred adding the card');
                console.log(err);
            });
        return;
    }

    // Multiple matches were found
    let nameMatchCards = cards.filter(
        (matchName) => matchName.name === cardName
    );
    if (nameMatchCards.length !== 0) {
        // Only one exact match, validate and add it
        if (nameMatchCards.length === 1) {
            const card = nameMatchCards[0];
            const valid = await validateCard(interaction, card);
            if (!valid) {
                return;
            }
            addCard(user.id, card.uuid, isFoil, count, location)
                .then(() => {
                    interaction.editReply('Card added');
                })
                .catch((err) => {
                    interaction.editReply('An error occurred adding the card');
                    console.log(err);
                });
            return;
        } else {
            // There are multiple exact matches (probably different versions of the same card, ex showcase & normal)
            const diff = findDifferences(nameMatchCards);
            console.log(diff);
            interaction.editReply('doot');
        }
    } else {
        interaction.editReply('pending');
    }
}

async function deleteCardFromCollection(interaction) {
    const cardName = interaction.options.getString('name');
    const cardSet = interaction.options.getString('set');
    const isFoil =
        interaction.options.getBoolean('foil') === true ? true : false;
    const isToken =
        interaction.options.getBoolean('token') === true ? true : false;
    const count =
        interaction.options.getInteger('count') === null
            ? 1
            : interaction.options.getInteger('count');
    const location = interaction.options.getString('location');
    const user = interaction.user;

    const cards = await getCards(cardName, cardSet, isToken);

    if (cards.length === 0) {
        interaction.editReply(
            `Could not find \`${cardName}\` in set \`${cardSet}\``
        );
        return;
    }

    if (cards.length === 1) {
        const card = cards[0];
        const valid = await validateCard(interaction, card);
        if (!valid) {
            return;
        }
        getCardsInCollection(user.id, card.uuid, isFoil, location)
            .then((cards) => {
                if (cards.length === 0) {
                    interaction.editReply(
                        'You do not have this card in your collection'
                    );
                } else if (cards.length > 1) {
                    interaction.editReply(
                        "Multiple copies of the same card, this shouldn't be possible"
                    );
                } else {
                    if (cards[0].count < count) {
                        interaction.editReply(
                            `You only have ${cards[0].count} of this card in your collection, cannot remove ${count}`
                        );
                    } else {
                        removeCard(
                            user.id,
                            card.uuid,
                            isFoil,
                            cards[0].count,
                            count,
                            location
                        ).then(() => {
                            interaction.editReply('Card removed');
                        });
                    }
                }
            })
            .catch((err) => {
                interaction.editReply('An error occurred removing this card');
                console.log(err);
            });
    }
}

async function validateCard(interaction, card) {
    const cardName = interaction.options.getString('name');
    const cardSet = interaction.options.getString('set');
    const isFoil =
        interaction.options.getBoolean('foil') === true ? true : false;

    if (card.name !== cardName) {
        interaction.editReply(
            `Could not find \`${cardName}\` in set \`${cardSet}\`. Did you mean \`${card.name}\`?`
        );
        return false;
    }
    const hasFoil = card.hasFoil;
    const hasNonFoil = card.hasNonFoil;
    if (isFoil && !hasFoil) {
        interaction.editReply(
            'Foil card was selected, but this card does not have a foil version'
        );
        return false;
    } else if (!isFoil && !hasNonFoil) {
        interaction.editReply(
            'Non-foil card was selected, but this card only exists in foil'
        );
        return false;
    }
    return true;
}

// Helper function for differentiating multiple versions of the same card within a set
// Compiles a list of all differences in the JSON between every card in the list
// Throws away expected differences (such as IDs)
function findDifferences(cardList) {
    const skipped = [
        'id',
        'cardKingdomEtchedId',
        'cardKingdomFoilId',
        'cardKingdomId',
        'cardsphereId',
        'mcmId',
        'mcmMetaId',
        'mtgArenaId',
        'mtgjsonFoilVersionId',
        'mtgjsonNonFoilVersionId',
        'mtgjsonV4Id',
        'mtgoFoilId',
        'mtgoId',
        'multiverseId',
        'originalText',
        'otherFaceIds',
        'purchaseUrls',
        'scryfallId',
        'scryfallIllustrationId',
        'scryfallOracleId',
        'tcgplayerEtchedProductId',
        'tcgplayerProductId',
        'uuid',
        'variations'
    ];
    let diff = [];

    for (let i = 0; i < cardList.length; i++) {
        let baseCard = cardList[i];
        let thisDiff = {};
        for (let j = 0; j < cardList.length; j++) {
            let compareCard = cardList[j];
            for (const key in baseCard) {
                if (skipped.includes(key)) {
                    continue;
                }
                if (baseCard[key] !== compareCard[key]) {
                    thisDiff[key] = baseCard[key];
                }
            }
        }
        diff[i] = thisDiff;
    }

    return diff;
}

async function hasTable(userId) {
    let conn;
    let exists;
    try {
        conn = await pool.getConnection();
        const tables = await conn.query(`SHOW TABLES LIKE 'u${userId}';`);

        if (tables.length === 0) {
            exists = false;
        } else {
            exists = true;
        }
    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            conn.end();
            return exists;
        }
    }
}

// Each user's collection only needs the card UUID and then data not stored in the mtgjson data
// All other information about the card will be dynamically pulled from mtgjson database
async function createTable(userId) {
    let conn;
    try {
        conn = await pool.getConnection();
        const newTable = await conn.query(
            `CREATE TABLE IF NOT EXISTS u${userId} (
                uuid CHAR(36) NOT NULL,
                foil BOOLEAN NOT NULL,
                count SMALLINT NOT NULL,
                location VARCHAR(100)
              );`
        );
    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            return conn.end();
        }
    }
}

async function isValidSet(setCode) {
    console.log(setCode);
    let conn;
    let set = false;
    try {
        conn = await pool.getConnection();
        console.log(conn);
        let res = await conn.query(
            `SELECT code FROM sets WHERE (code='${setCode}') OR (name='${setCode}')`
        );
        console.log(res);
        if (res.length === 1) {
            set = res[0].code;
        }
    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            conn.end();
            return set;
        }
    }
}

async function getCards(cardName, setCode, token) {
    let conn;
    let cards;
    try {
        conn = await pool.getConnection();
        if (token) {
            cards = await conn.query(
                `SELECT * FROM tokens WHERE (name LIKE '%${cardName}%') AND (setCode='${setCode}');`
            );
        } else {
            cards = await conn.query(
                `SELECT * FROM cards WHERE (name LIKE '%${cardName}%') AND (setCode='${setCode}');`
            );
        }
    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            conn.end();
            return cards;
        }
    }
}

async function addCard(userId, uuid, foil, count, location) {
    let existing = await getCardsInCollection(userId, uuid, foil, location);
    if (existing.length === 1) {
        count = existing[0].count + count;
    }

    let conn;
    try {
        conn = await pool.getConnection();
        if (existing.length === 1) {
            if (location === null) {
                added = await conn.query(
                    `UPDATE u${userId} SET count=${count} WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location IS NULL);`
                );
            } else {
                added = await conn.query(
                    `UPDATE u${userId} SET count=${count} WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location='${location}');`
                );
            }
        } else {
            added = await conn.query(
                `INSERT INTO u${userId} VALUES (?, ?, ?, ?);`,
                [uuid, foil, count, location]
            );
        }
    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            return conn.end();
        }
    }
}

async function removeCard(userId, uuid, foil, existingCount, count, location) {
    let conn;
    try {
        conn = await pool.getConnection();
        if (existingCount === count) {
            if (location === null) {
                removed = await conn.query(
                    `DELETE FROM u${userId} WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location IS NULL);`
                );
            } else {
                removed = await conn.query(
                    `DELETE FROM u${userId} WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location='${location});`
                );
            }
        } else {
            if (location === null) {
                added = await conn.query(
                    `UPDATE u${userId} SET count=${
                        existingCount - count
                    } WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location IS NULL);`
                );
            } else {
                added = await conn.query(
                    `UPDATE u${userId} SET count=${
                        existingCount - count
                    } WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location='${location}');`
                );
            }
        }
    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            return conn.end();
        }
    }
}

async function getCardsInCollection(userId, uuid, foil, location) {
    let conn;
    let cards;
    try {
        conn = await pool.getConnection();
        if (location === null) {
            cards = await conn.query(
                `SELECT * FROM u${userId} WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location IS NULL);`
            );
        } else {
            cards = await conn.query(
                `SELECT * FROM u${userId} WHERE (uuid='${uuid}') AND (foil=${foil}) AND (location='${location}');`
            );
        }
    } catch (err) {
        throw err;
    } finally {
        if (conn) {
            conn.end();
            return cards;
        }
    }
}

function createConfirmationButtons(userId) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm${userId}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`cancel${userId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
    );
    return row;
}

function createDeleteEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('Are you sure?')
        .setDescription(
            'Are you sure you want to delete your collection? This is permanent and cannot be undone.'
        );
    return embed;
}

function createDisabledConfirmationButtons(userId) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm${userId}`)
            .setLabel('Confirm')
            .setDisabled(true)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`cancel${userId}`)
            .setLabel('Cancel')
            .setDisabled(true)
            .setStyle(ButtonStyle.Danger)
    );
    return row;
}

function createTimeoutDeleteEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('Deletion timed out')
        .setDescription('Collection deletion has timed out');
    return embed;
}
