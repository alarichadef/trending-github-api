const express = require('express');
var router = express.Router();
const NodeCache = require( "node-cache" );
const myCache = new NodeCache();

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const minute = 60;
const hour = 60*60;
const day = hour*24;
const week = day*7;
const ranges = ['daily', 'weekly', 'monthly'];
const ttl = {'daily': minute, 'weekly': hour, monthly: day}
const url = 'https://github.com/trending';

const getSpokenLanguage = (cb) => {
    fetch(url)
    .then(res => res.text())
    .then(body => {
        const $ = cheerio.load(body);
        let languages = [];
        $( "#select-menu-spoken-language .select-menu-item").each( (i, elem ) => {
            let $a = $(elem).find('span');
            let code = $(elem).attr('href').split('=').pop();
            languages.push({language: $a.text().trim(), code});
        });
        cb(languages);
    });
}

router.get('/spoken-languages', (req, res) => {
    let languages = myCache.get('spoken-languages');
    if (languages) {
        console.log('from cache')
        return res.status(200).json(languages);
    }
    return getSpokenLanguage(languages => {
        console.log('from fetch')
        myCache.set('spoken-languages', languages, week);
        return res.status(200).json(languages)
    });
});

const getLanguage = (cb) => {
    fetch(url)
    .then(res => res.text())
    .then(body => {
        const $ = cheerio.load(body);
        let languages = [];
        $( "#languages-menuitems .select-menu-item").each( (i, elem ) => {
            let $a = $(elem).find('span');
            languages.push($a.text().trim());
        });
        cb(languages);
    });
}

router.get('/languages', (req, res) => {
    console.warn('route hit languages')
    let languages = myCache.get('languages');
    if (languages) {
        console.log('from cache')
        return res.status(200).json(languages);
    }
    return getLanguage(languages => {
        console.log('from fetch')
        myCache.set('languages', languages, week);
        return res.status(200).json(languages)
    });
});

const getRepositories = (params, cb) => {
    let fullUrl = url + params;
    fetch(fullUrl)
    .then(res => res.text())
    .then(body => {
        const $ = cheerio.load(body);
        let repositories = [];
        $('article').each((i, elem) => {
            let $a = $(elem).find('h1');
            let header = $a.text().trim().split('/').map(x => x.trim());
            let author = header[0];
            let name = header[1];
            let langColor =  $(elem).find('.repo-language-color')
            langColor = langColor.length ? langColor.css('background-color') : null;
            let description = $(elem).find('p').text().trim();
            let url = `https://github.com${$(elem).find('h1 a').attr('href')}`;
            let avatar = $(elem).find('.avatar').attr('src')?.replace(/\?s=.*$/, '');
            let stars =  parseInt($(elem).find(".mr-3 svg[aria-label='star']").first().parent().text().trim().replace(',', ''));
            let forks =  parseInt($(elem).find("svg[aria-label='fork']").first().parent().text().trim().replace(',', ''));
            let language = $(elem).find('[itemProp=programmingLanguage]').text().trim()
            repositories.push({author, name, langColor, description, url, stars, forks, language, avatar});
        });
        cb(repositories);
    });
}


router.get('/repositories', (req, res) => {
    let language = req.query.language;
    if(language) {
        let languages = myCache.get('languages');
        if (!languages) {
            return res.status(500).json('No languages');
        }
        if (!languages.includes(language)) {
            return res.status(400).json('Unknown language');
        }
    }
    let spokenLanguage = req.query.spokenLanguage;
    if(spokenLanguage) {
        let spokenLanguages = myCache.get('spoken-languages');
        if (!spokenLanguages) {
            return res.status(500).json('No languages');
        }
        if (!spokenLanguages.find(spoken => spokenLanguage === spoken.code)) {
            return res.status(400).json('Unknown language');
        }
    }
    let range = req.query.range;
    if (range) {
        if (!ranges.includes(range)) {
            return res.status(400).json('Unknown range');
        }
    } else {
        range = 'daily';
    }
    let params = '';
    if (language) {
        params += '/' + language.toLowerCase().split(' ').join('-');
    }
    params += '?since=' + range;
    if (spokenLanguage) {
        params += '&spoken_language_code=' + spokenLanguage;
    }
   let cache = myCache.get(params);
   if (cache) {
       console.log('from cache')
       return res.status(200).json(cache);
   }
    getRepositories(params, (repositories) => {
        console.log('from url');
        myCache.set(params, repositories, ttl[range]);
        return res.status(200).json(repositories);
    });

});

module.exports = router;