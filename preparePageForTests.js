import * as dotenv from 'dotenv';
//Pass simple browser tests
    async function preparePageForTests(page) {
        //user agent test
        const userAgent = dotenv.config().parsed.userAgent;
        await page.setUserAgent(userAgent);
    
        // Webdriver Test
        await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver',{
            get: () => false,
        });
        });
    
        //Pass the Chrome Test. //Но мы и так запускаем в хром а не хромиум
        await page.evaluateOnNewDocument(() => {
        // We can mock this in as much depth as needed
        window.navigator.chrome = {
            runtime: {},
            //etc, etc ..
        };
        });
    /*
        // Pass Permissions Test.
        await page.evaluateOnNewDocument(() => {
        const origianlQuery = window.navigator.permissions.query;
        return window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            origianlQuery(parameters)
        );
        });
    */
    /*
        //Pass the plugins length test. Мне кажется идеальнее использовать реальный
        // браузер с какими-то плагинами, например я сейчас запускаю свой обычный хром
        await page.evaluateOnNewDocument(() => {
        // Overwrite the 'plugins' property to use a custom getter.
        Object.defineProperty(navigator, 'plugins', {
            //this just needs to have 'length > 0' for the current test,
            //but we could mock the plugins too if necessary.
            get: () => [1, 2, 3, 4, 5],
        });
        });
    */
        /*//Pass the language test.//можно залокалить в зависимости от айпи мб
        await page.evaluateOnNewDocument (() => {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        });
        */
    };
    export default preparePageForTests;