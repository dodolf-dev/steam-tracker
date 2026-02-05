// Récupère les détails des DLC (nom, prix, etc.)
async function getDLCDetails(dlcIds) {
  if (!dlcIds || dlcIds.length === 0) return [];

  try {
    const dlcDetails = [];
    
    for (const dlcId of dlcIds) {
      const url = `https://store.steampowered.com/api/appdetails?appids=${dlcId}&cc=fr&l=fr`;
      const response = await fetch(url);
      const data = await response.json();

      if (data[dlcId] && data[dlcId].success) {
        const dlcData = data[dlcId].data;
        dlcDetails.push({
          appid: dlcId,
          name: dlcData.name || "Inconnu",
          header_image: dlcData.header_image || null,
          price_overview: dlcData.price_overview || null
        });
      }
    }

    return dlcDetails;
  } catch (error) {
    console.error(`Erreur lors de la récupération des DLC: ${error.message}`);
    return [];
  }
}

// Récupère les données d'un jeu depuis l'API Steam
async function getSteamGameData(appId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&l=fr`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Vérifie que la réponse contient les données du jeu
    if (!data[appId]) {
      console.error(`Aucune donnée trouvée pour l'ID: ${appId}`);
      return null;
    }

    const gameData = data[appId];

    if (!gameData.success) {
      console.error(`Erreur: success = false pour l'ID: ${appId}`);
      return null;
    }

    // Recup des dlc
    let allSubs = [];
    if (gameData.data.package_groups && Array.isArray(gameData.data.package_groups)) {
      gameData.data.package_groups.forEach(group => {
        if (group.subs && Array.isArray(group.subs)) {
          allSubs = allSubs.concat(group.subs);
        }
      });
    }

    const dlcIds = gameData.data.dlc || [];
    const dlcDetails = await getDLCDetails(dlcIds);

    let dlcTotalPrice = 0;
    dlcDetails.forEach(dlc => {
      if (dlc.price_overview && dlc.price_overview.final) {
        dlcTotalPrice += dlc.price_overview.final;
      }
    });

    const extractedData = {
      success: gameData.success,
      data: {
        type: gameData.data.type,
        name: gameData.data.name,
        steam_appid: gameData.data.steam_appid,
        required_age: gameData.data.required_age,
        is_free: gameData.data.is_free,
        controller_support: gameData.data.controller_support,
        header_image: gameData.data.header_image || null,
        dlc: dlcDetails
      },
      dlc_total_price: dlcTotalPrice,
      price_overview: gameData.data.price_overview || null,
      subs: allSubs
    };

    return extractedData;
  } catch (error) {
    console.error(`Erreur lors de la récupération des données: ${error.message}`);
    return null;
  }
}

// console.log a supprimer plus tard
function displayGameData(data) {
  if (!data) return;

  console.log("\n╔════ DONNÉES DU JEU ════╗");
  console.log(`Nom: ${data.data.name}`);
  console.log(`ID Steam: ${data.data.steam_appid}`);
  console.log(`Type: ${data.data.type}`);
  console.log(`Gratuit: ${data.data.is_free ? "Oui" : "Non"}`);
  console.log(`Age requis: ${data.data.required_age}`);
  console.log(`Support manette: ${data.data.controller_support}`);
  if (data.data.header_image) {
    console.log(`Image Header: ${data.data.header_image}`);
  }
  console.log("╚════════════════════════╝");

  if (data.price_overview) {
    console.log("\n╔════ PRIX JEU ════╗");
    console.log(`Devise: ${data.price_overview.currency}`);
    console.log(`Prix initial: ${data.price_overview.initial_formatted}`);
    console.log(`Prix final: ${data.price_overview.final_formatted}`);
    console.log(`Réduction: ${data.price_overview.discount_percent}%`);
    console.log("╚═══════════════════╝");
  } else {
    console.log("\nPas d'informations de prix disponibles");

  }

  if (data.data.dlc && data.data.dlc.length > 0) {
    console.log(`\n╔════ DLC (${data.data.dlc.length}) ════╗`);
    data.data.dlc.forEach((dlc, index) => {
      console.log(`\n${index + 1}. ${dlc.name || "Inconnu"} (ID: ${dlc.appid})`);
      if (dlc.header_image) {
        console.log(`   Image Header: ${dlc.header_image}`);
      }
      if (dlc.price_overview) {
        const priceFinal = (dlc.price_overview.final / 100).toFixed(2);
        const priceInitial = (dlc.price_overview.initial / 100).toFixed(2);
        console.log(`   Prix initial: ${priceInitial}€`);
        console.log(`   Prix final: ${priceFinal}€`);
        console.log(`   Réduction: ${dlc.price_overview.discount_percent}%`);
      } else {
        console.log(`   Pas d'information de prix`);
      }
    });

    if (data.dlc_total_price > 0) {
      const totalPrice = (data.dlc_total_price / 100).toFixed(2);
      console.log(`\nTOTAL DLC: ${totalPrice}€`);
    } else {
      console.log(`\nTOTAL DLC: 0€`);
    }
    console.log("╚═════════════════════════════════╝");
  } else {
    console.log("\nAucun DLC disponible");
  }

  if (data.subs && data.subs.length > 0) {
    console.log("\n╔════ VERSIONS SUPPLÉMENTAIRES ════╗");
    data.subs.forEach((sub, index) => {
      // Extrait le texte HTML pour récupérer nom et prix
      const optionText = sub.option_text.replace(/(<([^>]+)>)/gi, "");
      const priceEur = (sub.price_in_cents_with_discount / 100).toFixed(2);
      console.log(`\n${index + 1}. ${optionText}`);
      console.log(`   ID Package: ${sub.packageid}`);
      console.log(`   Réduction: ${sub.percent_savings_text}`);
      console.log(`   Prix: ${priceEur}€`);
      console.log(`   Gratuit: ${sub.is_free_license ? "Oui" : "Non"}`);
    });
    console.log("\n╚═════════════════════════════════╝");
  }

  console.log("\n");
}

// Test avec l'ID 227300 (Portal 2)
const testAppId = 2483190;
console.log(`Récupération des données pour l'ID: ${testAppId}`);

getSteamGameData(testAppId).then(data => {
  displayGameData(data);
});

// Exporte les fonctions pour utilisation externe
module.exports = { getSteamGameData, getDLCDetails, displayGameData };