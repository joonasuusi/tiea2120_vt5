"use strict";
// seuraavat estävät jshintin narinat jqueryn ja leafletin objekteista
/* jshint jquery: true */
/* globals L */

console.log(data);
// kirjoita tänne oma ohjelmakoodisi

var dragTyyppi;
var rastitJaJoukkueJaMatka=[];

window.onload = function(e){ 

    // Kartan luominen/asetukset
    let div = $("#map");
	div.css("width", Math.round(window.innerWidth) + "px");
    div.css("height", Math.round(window.innerHeight/2) + "px");
    
    // Haetaan max ja min koordinaatit 
    let scale = minMaxKoordinaatit(data); 

    let mymap = new L.map('map', {
        crs: L.TileLayer.MML.get3067Proj()
    }).fitBounds([[scale[0], scale[1]], [scale[2], scale[3]]]);
    
    L.tileLayer.mml_wmts({ layer: "maastokartta", key : "64ac6337-80e0-4e53-979f-934b94e98504" }).addTo(mymap);

    
    let aladiv = $("#aladiv");
	aladiv.css("width", Math.round(window.innerWidth) + "px");
    aladiv.css("height", Math.round(window.innerHeight/2) + "px");

    
    koorditRasteihin(data.joukkueet, data.rastit);

    for (let i = 0; i < data.joukkueet.length; i++) {
        joukkueenmatka(data.joukkueet[i]);
    }
    
    // Rastien piirtäminen karttaan
    piirraRastit(data, mymap);
    
    // Joukkuelistauksen teko
    joukkueListaus(data);  
    
    // Rastilistauksen teko
    rastiListaus(data);

    // Keskimmäin div, dropzone
    let drop = document.getElementById('kartalladiv');
    
    // Kartalla dragstart
    // Asetetaan globaali muuttuja dragTyyppi arvo joukkueeksi tai rastiksi raaaahattavan elementin mukaan
    drop.addEventListener("dragstart", function(e) {
        e.dataTransfer.setData("text/plain", e.target.getAttribute("id"));
        
        if(typeof e.target.joukkue !== 'undefined') {
            dragTyyppi = "joukkue";
            mymap.removeLayer(e.target.reitti);
        }
        if(typeof e.target.rasti !== 'undefined') {
            dragTyyppi = "rasti";
        }
    });

    // Kartalla dragend
    drop.addEventListener("dragend", function(e) {
        dragTyyppi = undefined;
    });

    // Kartalla dragover
    drop.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    // Kartalla div drop
    drop.addEventListener("drop", function(e) { 
        e.preventDefault();
        let id = e.dataTransfer.getData('text');
        let dropped = document.getElementById(id);
    
        // Elementin lisääminen
        if (e.target.tagName === 'LI'){
            e.target.parentElement.insertBefore(dropped, e.target);
        } 
        else {
            e.target.lastElementChild.appendChild(dropped);
        }

        // Elementin sijainti
        let dragX = e.pageX;
        let dragY = e.pageY;
        dropped.style.position = "absolute";
        dropped.style.top = dragY + 'px';
        dropped.style.left = dragX +  'px';

        // Piirretään reitti kartalle jos dropataan joukkue
        if(typeof dropped.joukkue !== "undefined"){
            let reitti = piirraReitti(dropped.joukkue, mymap);

            // viite piirrettyyn reittiin jotta poisto on helpompaa
            dropped.reitti = reitti;
        }       
    });

    // Joukkue div
    let joukkueLista = document.getElementById('joukkuediv');

    // Joukkue div dragstart
    joukkueLista.addEventListener('dragstart' ,function(e) {
        dragTyyppi = "joukkue";
    });


    // Joukkue div dragover
    joukkueLista.addEventListener('dragover', function(e) {
        e.preventDefault();
        // Jos dragTyyppin arvo on joukkue niin tiputetaan
        if(dragTyyppi === "joukkue"){
            e.dataTransfer.dropEffect = 'move';
        }
        else {
            e.dataTransfer.dropEffect = 'none';
        }
    });

    // Joukkue drop
    joukkueLista.addEventListener('drop', function(e) {
        e.preventDefault();
        let id = e.dataTransfer.getData('text');
        let dropped = document.getElementById(id);
        dropped.style.position = "static";
        
        // Elementin lisäys
        if (e.target.tagName === 'LI'){
            e.target.parentElement.insertBefore(dropped, e.target);
        } 
        else {
            e.target.firstElementChild.appendChild(dropped);
        }
    });
    

    // Rasti div
    let rastiLista = document.getElementById('rastitdiv');

    // Rasti div dragover
    rastiLista.addEventListener('dragover', function(e) {
        e.preventDefault();
        // Jos dragTyyppi on rasti niin tiputetaan
        if(dragTyyppi === "rasti"){
            e.dataTransfer.dropEffect = 'move';
        }
        else {
            e.dataTransfer.dropEffect = 'none';
        }
    });

    // Rastin drop
    rastiLista.addEventListener('drop', function(e) {
        e.preventDefault();
        let id = e.dataTransfer.getData('text');
        let dropped = document.getElementById(id);
        dropped.style.position = "static";
        
        // Elementin lisäys
        if (e.target.tagName === 'LI'){
            e.target.parentElement.insertBefore(dropped, e.target);
        } 
        else {
            e.target.firstElementChild.appendChild(dropped);
        }
    });

    // Rasti div dragstart
    rastiLista.addEventListener('dragstart' ,function(e) {
        dragTyyppi = "rasti";
    });


}; // windowonload end


/**
 * vertailufunktio joukkueille
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
function compareJoukkue(a, b) {   
    let nimi1 = a.nimi.toLowerCase().trim();
    let nimi2 = b.nimi.toLowerCase().trim();
    if (nimi1 < nimi2)  {
        return -1;
    }
    if (nimi1 > nimi2) {
        return 1;
    }
    return 0;
}

/**
 * vertailufunktio rasteille
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
function compareRasti(a, b) {   
    let koodi1 = a.koodi.toLowerCase().trim();
    let koodi2 = b.koodi.toLowerCase().trim();
    if (koodi1 < koodi2)  {
        return 1;
    }
    if (koodi1 > koodi2) {
        return -1;
    }
    return 0;
}

/**
 * Rasti li-elementit
 * @param {*} rastit 
 * @param {*} i 
 * @returns 
 */
function luoRastiLi(rastit, i){
    let rastili = document.createElement("li");
    rastili.style.backgroundColor = rainbow(rastit.length,i);
    rastili.textContent = rastit[i].koodi;
    rastili.setAttribute('draggable','true');
    rastili.setAttribute('id','rasti'+i);
    rastili.addEventListener("dragstart", function(e) {
        e.dataTransfer.setData("text/plain", rastili.getAttribute("id"));
    });
    return rastili;
}

/**
 * Luodaan li-elementit joukkuelistaukseen
 * @param {*} joukkueet 
 * @param {*} index 
 * @returns 
 */
function luoJoukkueLi(joukkueet, index, k_index){
    let nimili = document.createElement("li");
    nimili.style.backgroundColor = rainbow(joukkueet.length,index);
    nimili.textContent = joukkueet[index].nimi+"("+rastitJaJoukkueJaMatka[k_index]+")";
    nimili.setAttribute('draggable','true');
    nimili.setAttribute('id','joukkue'+index);
    nimili.addEventListener("dragstart", function(e) {
        e.dataTransfer.setData("text/plain", nimili.getAttribute("id"));
    });
    return nimili;
}

/**
 * Piirrettään rastit
 * @param {*} data käytettävä data
 * @param {*} map kartta johon piirretään
 */
function piirraRastit(data, map){
    //var size = 150 * 2;
    //var iconSize = size + (15 * 2);
    let rastit = data.rastit;

    for(let i in rastit) {
        var icon = L.divIcon({
            html: rastit[i].koodi,
            className: 'rastinumero',
            iconSize: [10, 5]
          });
        L.circle([rastit[i].lat, rastit[i].lon], {color: 'red', fillOpacity: 0.3, radius: 150}).addTo(map);
        
        L.marker([rastit[i].lat, rastit[i].lon], {icon: icon}).addTo(map);
    }

}

/**
 * Listaa joukkueet
 * @param {*} data data jsota joukkueet saadaan
 */
function joukkueListaus(data) {
    let joukkueet = data.joukkueet;
    joukkueet.sort(compareJoukkue);
    let joukkueul = document.getElementById("joukkueet");
    let k = 0;
    for(let i in joukkueet){
        let nimili = luoJoukkueLi(joukkueet,i,k);
        k++;
        nimili.joukkue = joukkueet[i];
        joukkueul.append(nimili);
    }
}

/**
 * Listaa rastit sivulle
 * @param {*} data käytettävä data
 */
function rastiListaus(data) {
    let rastit = data.rastit;
    rastit.sort(compareRasti);       
    let rastitul = document.getElementById("rastit");
    for(let i in rastit){
        let rastili = luoRastiLi(rastit,i);
        rastili.rasti = rastit[i];
        rastitul.append(rastili);
    }
}

/**
 * Piirtää reitin
 * @param {*} joukkue 
 * @param {*} map 
 * @returns 
 */
function piirraReitti(joukkue,map) {
    let joukkueet = data.joukkueet;
    let index = joukkueet.indexOf(joukkue);
    return piirra(joukkue, map, rainbow(joukkueet.length, index));
}

/**
 * Apufunktio piirtämiselle
 * @param {*} joukkue 
 * @param {*} map 
 * @param {*} vari 
 * @returns 
 */
function piirra(joukkue, map, vari) {
    let koordinaatit = [];
    for(let i in joukkue.rastit) {
        for (let j in data.rastit) {
            if(parseInt(joukkue.rastit[i].rasti) === parseInt(data.rastit[j].id)) {
                koordinaatit.push([data.rastit[j].lat, data.rastit[j].lon]);
            }
        }
    }
    let polyline = L.polyline(koordinaatit, {color: vari}).addTo(map); 
    polyline.bringToFront();
    return polyline;
}


/**
 * Etsii pienimmät ja suurimamt koordinaatit jotta kartta voidaan keskittää
 * @param {*} data käytettävä data
 * @returns 
 */
function minMaxKoordinaatit(data){
    let rastit = data.rastit;
    
    let suurinLat = rastit[0].lat;
    let pieninLat = rastit[0].lat;
    
    let suurinLon = rastit[0].lon;
    let pieninLon = rastit[0].lon;

    for(let i in rastit) {
        if(rastit[i].lat < pieninLat){
            pieninLat = rastit[i].lat;
        } 

        if(rastit[i].lat > suurinLat){
            suurinLat = rastit[i].lat;
        } 

        if(rastit[i].lon < pieninLon) {
            pieninLon = rastit[i].lon;
        }

        if(rastit[i].lon > suurinLon) {
            suurinLon = rastit[i].lon;
        }
    }
    return [pieninLat, pieninLon , suurinLat, suurinLon];
}

function rainbow(numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    let r, g, b;
    let h = step / numOfSteps;
    let i = ~~(h * 6);
    let f = h * 6 - i;
    let q = 1 - f;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    let c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}

/**
 * Lahtoselta lainattu funktio
 * @param {*} lat1 
 * @param {*} lon1 
 * @param {*} lat2 
 * @param {*} lon2 
 * @returns 
 */
 function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
  }
  
  function deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
 * Laskee joukkueen matkan
 * @param {*} data 
 * @param {*} joukkue 
 * @returns 
 */
function joukkueenmatka(joukkue) {
    let matka = 0;
    let rastit = haeRastit(joukkue);
   
    if (rastit.length < 1) {
        rastitJaJoukkueJaMatka.push(matka);
    }
    for (let l = 0; l < rastit.length; l++) {
        if (rastit[l].lat == undefined || rastit[l].lon == undefined) {
            continue;
        }

        let l1 = l+1;
        if (l1 >= rastit.length) {
            matka = Math.round(matka);
            
            rastitJaJoukkueJaMatka.push(matka);
            return;
        }
        
        matka += getDistanceFromLatLonInKm(parseFloat(rastit[l].lat), parseFloat(rastit[l].lon), parseFloat(rastit[l1].lat), parseFloat(rastit[l1].lon));
    } 
    
}

/**
 * Hakee rastit matkan laskua varten
 * @param {*} data 
 * @param {*} joukkue 
 * @returns 
 */
 function haeRastit(joukkue) {
    let taulu = [];
    for (let i = 0; i < joukkue.rastit.length; i++) {
        if (joukkue.rastit[i].lat != undefined) {
            taulu.push(joukkue.rastit[i]);
        }
        
        //if (joukkue.rastit[i].rasti.koodi != undefined) {
         //   taulu.push(joukkue.rastit[i].rasti);
        //}
    }
    return taulu;
}


function koorditRasteihin(joukkueet, datarastit) {
    for (let i = 0; i < datarastit.length; i++) {
        let koodi = datarastit[i].id;
        for (let j = 0; j < joukkueet.length; j++) {
            let joukrastit = joukkueet[j].rastit;
            for (let k = 0; k < joukrastit.length; k++) {
                let rastikoodi = joukrastit[k].rasti;
                if (rastikoodi === koodi) {
                    joukrastit[k].lat = datarastit[i].lat;
                    joukrastit[k].lon = datarastit[i].lon;
                }
            }
            
        }
    }
}