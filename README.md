### Who Am I : MRE for ALTSPACE

This is a small ice-breaker game based on WearAHat sample code from Microsoft.

## How to play ?
This MRE add a hat. Player can click into the Hat to pick a name which will be attached on his back.
Then he can guess this name by asking question to others players (who have to answer only with YES or NO).


## How to deploy this project ?
Clone this project Open a command prompt to this folder and run `npm install`, then  `npm run build` and `npm start`
Now you can add this MRE with `ws://127.0.0.1:3901?country=mycountry`

If the MRE display "VERSION : WOLRD" instead of "VERSION : mycountry". This mean that your country isn't support for now. 
In this case, *don't hesitate to send me a list of name for your country* (look at countries/france.json to see an example)

## Requirement
- nodejs (npm)


