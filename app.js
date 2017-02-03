//importing modules
var express = require( 'express' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );

//creating a new express server
var app = express();

//setting EJS as the templating engine
app.set( 'view engine', 'ejs' );

//setting the 'assets' directory as our static assets dir (css, js, img, etc...)
app.use( '/assets', express.static( 'assets' ) );


//makes the server respond to the '/' route and serving the 'home.ejs' template in the 'views' directory
/*app.get( '/', function ( req, res ) {
    res.render( 'home', {
        message: 'The Home Page!',
        test: 'WTF'
    });
});


app.get( '/', function ( req, res ) {
    request( 'https://www.leboncoin.fr/ventes_immobilieres/1076257949.htm?ca=12_s', function ( error, response, body ) {
        if ( !error && response.statusCode == 200 ) {
            console.log( body ) // show the html for le bon coin
        }

        dataRecuperer( body )

        //res.send( body )
    })
});

function dataRecuperer( body ) {
    if ( !error ) {
        var $ = cheerio.load( html );
        var price, surface, city, type;
        var json = { price: "", surface: "", city: "", type: "" };
        var data = console.log( $( "section.properties span.value" ) )

        price = data.children().first().text();
        console.log( price );
        city = data.children().next().text();

        json.price = price;
        json.city = city;

    }

}
*/

//Function qui remplace une chaine de caractère par une autre dans la variable expr
function Remplace( expr, a, b ) {
    var i = 0
    while ( i != -1 ) {
        i = expr.indexOf( a, i );
        if ( i >= 0 ) {
            expr = expr.substring( 0, i ) + b + expr.substring( i + a.length );
            i += b.length;
        }
    }
    return expr
}


//Schéma JSON : 
var info = {
    Title: "General information of the property",
    price: 0,
    surface: 0,
    city: '',
    codePostal: '',
    type: "",
    prixM2: 0,
};

var estimation = {
    Title: "Estate valuation",
    Averageprice: 0,
}



//makes the server respond to the '/' route and serving the 'home.ejs' template in the 'views' directory
app.get( '/', function ( req, res ) {
    request( 'https://www.leboncoin.fr/ventes_immobilieres/1084183943.htm?ca=12_s', function ( error, response, body ) {
        if ( !error && response.statusCode == 200 ) { //Si y'a pas d'erreur 
            var $ = cheerio.load( body );

            //prix du bien immobilier
            $( 'h2.item_price.clearfix span.value' ).each( function ( i, element ) {
                var a = $( this );
                info.price = a.text();
            });

            //Surface du bien :
            //On balaye les div qui contiennent un h2 de classe clearfix et un span de class property jusqu'à trouver celui qui contient la Surface :
            $( 'h2.clearfix span.property' ).each( function ( i, element ) {
                var a = $( this );
                if ( a.text() == "Surface" ) {
                    info.surface = a.next().text()
                }
            });

            //Ville et code postal du bien : 
            $( 'div.line.line_city span.value' ).each( function ( i, element ) {
                var a = $( this );
                //On split le résultat qui contient la ville et le code postal dans le même string : 
                info.city = a.text().split( ' ' )[0];
                info.codePostal = a.text().split( ' ' )[1];
            });

            //Type du bien : 
            $( 'h2.clearfix span.property' ).each( function ( i, element ) {
                var a = $( this );
                if ( a.text() == "Type de bien" ) {
                    info.type = a.next().text()
                }
            });

            //On retire € et les espaces de la chaine de caractères du prix pour ne garder que les chiffres et on converti ensuite en int            
            info.price = parseInt( Remplace( Remplace( info.price, "€", "" ), " ", "" ) );
            //On retire le "m2" de la chaine de caractère de surface : 
            info.surface = parseInt( Remplace( info.surface, " m2", "" ) );

            //Calcul du prix du m2:
            info.prixM2 = info.price / info.surface;

            //On va ensuite chercher le prix moyen d'un bien dans la même ville sur une autre site : 


            //On entre directement sur le résultat de la recherche avec la concaténation du site avec la ville - codePostal : 
            request( 'https://www.meilleursagents.com/prix-immobilier/' + info.city.toLowerCase() + '-' + info.codePostal, function ( error, response, body ) {
                if ( !error && response.statusCode == 200 ) {
                    var averagePrice = "";
                    //Il faut maintenant récupérer le prix moyen du mètre carré : 
                    var $ = cheerio.load( body );
                    $( 'div.small-12.medium-6.columns.prices-summary__cell--row-header ' ).each( function ( i, element ) {
                        var a = $( this );
                        //Si on cherche le prix au m2 d'un appartement : 
                        if ( info.type == "Appartement" ) {

                            if ( a.children()[0].next.data == "Prix m2 appartement" ) {
                                averagePrice = a.next().next().text();
                                averagePrice = averagePrice.substring( 14, 19 );
                                averagePrice = averagePrice.split( " " );
                                estimation.Averageprice = averagePrice[0] + averagePrice[1];
                            }
                        }
                        //Si on cherche le prix au m2 d'une maison : 
                        if ( info.type == "Maison" ) {
                            if ( a.children()[0].next.data == " Prix m2 maison" ) {
                                averagePrice = a.next().next().text();
                                averagePrice = averagePrice.substring( 14, 19 );
                                averagePrice = averagePrice.split( " " );
                                estimation.Averageprice = averagePrice[0] + averagePrice[1];
                            }
                        }
                    });
                }
                //Il ne reste plus qu'à comparer les deux valeurs et donner un verdict : 
                var verdict = "";
                if ( estimation.Averageprice < info.prixM2 ) {
                    verdict = "Le prix au m2 de ce bien est au dessus de la moyenne pour cette ville.";
                }
                else if ( estimation.Averageprice == info.prixM2 ) {
                    verdict = "Le prix au m2 de ce bien est exactement celui de la moyenne pour cette ville"
                }
                else {
                    verdict = "Le prix au m2 de ce bien est inférieur à celui de la moyenne pour cette ville"
                }


                //Affichage des données dans la page Web :
                res.render( 'home', {

                    message: info.price,
                    message2: info.surface,
                    message3: info.city,
                    message4: info.codePostal,
                    message5: info.type,
                    message7: info.prixM2,
                    message8: estimation.Averageprice,
                    message9: verdict,
                });
            });

        }
    })
});




//launch the server on the 3000 port
app.listen( 3000, function () {
    console.log( 'App listening on port 3000!' );
});