# ResetEra-GiftHelper

**Update July 2021: adapted for MetaCouncil**

**Update September 2019: adapted to the new GiftBot incarnation**

A userscript to improve GiftBot usage in ResetEra and MetaCouncil. All credit goes to PeteTNT for his [NeoGAF version](https://github.com/petetnt/neogaf-monkeybot). I merely adapted it and even copied most of this README.

## Recommendation
Increase your browser's local storage to around 10Mb. By default, most browsers use 5Mb which is not enough to save the entire list of games on Steam. I'm going to refactor the script to address this but since it's not trivial increasing the storage size will do for now.

## Features
- "In library" highlighting for raffles.
- Wishlist highlighting (must be logged in the store in the same browser).

## How-to use
1. You must create a custom url for your Steam profile. Go to your profile, click "Edit profile" and you should see a field to input your desired custom id.
2. Download Tampermonkey: [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en).
3. Open [this link](https://github.com/fcostantini/resetera-gifthelper/raw/master/resetera-gifthelper.user.js). *Monkey should prompt you for install.
4. Navigate to any ResetEra thread (e.g. http://thesteamthread.com/)
5. Follow the instructions: ResetEra or MetaCouncil should now prompt you for your Steam custom id and the Steam API key.

## FAQ
### Where to get a SteamAPI key?
All use of the Steam Web API requires the use of an API Key. You can acquire one by [filling out this form](http://steamcommunity.com/dev/apikey). Use of the APIs also requires that you agree to the [Steam API Terms of Use](http://steamcommunity.com/dev/apiterms).

### Where to get the SteamID64?
The script automatically obtains the 64-bit Steam key based on your profile name, but you can also retrieve it yourself. Just add `?xml=1` after your profile name, for instance http://steamcommunity.com/id/YOURPROFILENAMEHERE/?xml=1 and get the key inside of `<steamID64></steamID64>`.

### I already own the game but it still isn't highlighted as "In library"
The games list is updated once per day maximum and the parser might/will miss games that are spelled differently than the actual Steam name, sorry about that.

## Contributing
Contributions are very welcome! File an issue or send a PR!
