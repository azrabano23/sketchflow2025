#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { Parser, ProcessNodeDefinitions } = require('html-to-react');
const { createElement } = require('react');
const cheerio = require('cheerio');


class HTMLToReactConverter {
  constructor(inputHtmlPath, outputDir, options = {}) {
    this.inputHtmlPath = path.resolve(inputHtmlPath);
    this.outputDir = path.resolve(outputDir);
    this.componentName = options.componentName || 'ConvertedComponent';
    this.useCssModules = true;
    this.htmlContent = '';
    this.cssContent = '';
    this.assets = [];
  }


  // Improved HTML reading with validation
  readHtmlFile() {
    try {
      this.htmlContent = fs.readFileSync(this.inputHtmlPath, 'utf8');
      if (!this.htmlContent.includes('<html')) {
        throw new Error('Invalid HTML: Missing <html> tag');
      }
      console.log(`✅ Read HTML file: ${path.basename(this.inputHtmlPath)}`);
    } catch (error) {
      console.error(`❌ Failed to read HTML: ${error.message}`);
      process.exit(1);
    }
  }


  // Enhanced HTML processing
  extractContentFromHtml() {
    const $ = cheerio.load(this.htmlContent);
   
    // Extract and preserve critical elements
    const bodyContent = $('body').html() || '';
    const headContent = $('head').html() || '';
   
    if (!bodyContent) {
      throw new Error('No content found in <body>');
    }


    // Extract CSS
    $('style').each((i, elem) => {
      this.cssContent += $(elem).html() + '\n';
    });


    // Process assets
    $('img, link[rel="stylesheet"], script[src]').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('href');
      if (src) this.assets.push(src);
    });


    // Create clean HTML structure
    this.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>${headContent}</head>
        <body>${bodyContent}</body>
      </html>
    `;
  }


  // More robust React component generation
  generateComponent() {
    try {
      const htmlToReactParser = new Parser();
      const reactElement = htmlToReactParser.parse(this.htmlContent);
     
      if (!reactElement) {
        throw new Error('Failed to parse HTML to React');
      }


      const componentCode = `
        import React from 'react';
        ${this.cssContent ? `import './styles/${this.componentName}.module.css';\n` : ''}
       
        const ${this.componentName} = () => {
          return (
            <div className="${this.componentName.toLowerCase()}-container">
              ${this.serializeReactElement(reactElement)}
            </div>
          );
        };
       
        export default ${this.componentName};
      `;


      fs.writeFileSync(
        path.join(this.outputDir, 'src/components', `${this.componentName}.js`),
        componentCode
      );
    } catch (error) {
      console.error(`❌ Component generation failed: ${error.message}`);
      this.createFallbackComponent();
    }
  }


  // Fallback for problematic HTML
  createFallbackComponent() {
    const fallbackCode = `
      import React from 'react';
     
      const ${this.componentName} = () => {
        return (
          <div style={{ padding: '20px', border: '1px solid red' }}>
            <h2>⚠️ Original content failed to render</h2>
            <div dangerouslySetInnerHTML={{ __html: \`${this.htmlContent.replace(/`/g, '\\`')}\` }} />
          </div>
        );
      };
     
      export default ${this.componentName};
    `;
   
    fs.writeFileSync(
      path.join(this.outputDir, 'src/components', `${this.componentName}.js`),
      fallbackCode
    );
  }


  createProjectStructure() {
    const dirs = [
      'src',
      'src/components',
      'src/styles',
      'public',
      'public/images'
    ];


    dirs.forEach(dir => {
      const fullPath = path.join(this.outputDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }


  extractCssFromHtml() {
    const $ = cheerio.load(this.htmlContent);
   
    // Extract internal styles
    $('style').each((i, elem) => {
      this.cssContent += $(elem).html() + '\n';
      $(elem).remove();
    });


    // Process inline styles to convert them to React format
    $('[style]').each((i, elem) => {
      const style = $(elem).attr('style');
      $(elem).attr('style', this.convertInlineStyleToReact(style));
    });


    this.htmlContent = $.html();
  }


  convertInlineStyleToReact(styleString) {
    return styleString
      .split(';')
      .filter(rule => rule.trim())
      .map(rule => {
        const [property, value] = rule.split(':').map(s => s.trim());
        const reactProperty = property
          .split('-')
          .map((part, i) => i === 0 ? part : part[0].toUpperCase() + part.slice(1))
          .join('');
        return `${reactProperty}:${value}`;
      })
      .join(';');
  }


  generateReactFiles() {
    this.generateComponent();
    this.generateApp();
    this.generateIndex();
    this.generatePublicFiles();
    this.generatePackageJson();
    this.generateCssFile();
  }


  generateComponent() {
      try {
          const parser = new Parser();
          const reactElement = parser.parse(this.htmlContent);
         
          // Only create CSS file if there's actual CSS content
          let cssImport = '';
          if (this.cssContent && this.cssContent.trim() !== '') {
              const cssDir = path.join(this.outputDir, 'src', 'styles');
              if (!fs.existsSync(cssDir)) {
                  fs.mkdirSync(cssDir, { recursive: true });
              }
             
              const cssPath = path.join(cssDir, `${this.componentName}.module.css`);
              fs.writeFileSync(cssPath, this.cssContent);
              cssImport = `import styles from '../styles/${this.componentName}.module.css';\n`;
              console.log(`✅ Created CSS file: src/styles/${this.componentName}.module.css`);
          }


          const componentCode = `import React from 'react';
  ${cssImport}


  const ${this.componentName} = () => {
    return (
      ${this.serializeReactElement(reactElement)}
    );
  };


  export default ${this.componentName};
  `;


          const componentDir = path.join(this.outputDir, 'src', 'components');
          if (!fs.existsSync(componentDir)) {
              fs.mkdirSync(componentDir, { recursive: true });
          }
         
          const componentPath = path.join(componentDir, `${this.componentName}.js`);
          fs.writeFileSync(componentPath, componentCode);
          console.log(`✅ Created React component: src/components/${this.componentName}.js`);
         
      } catch (error) {
          console.error('❌ Failed to generate component:', error.message);
          this.createFallbackComponent();
      }
  }
// Update the extractContentFromHtml method to better handle CSS
extractContentFromHtml() {
    const $ = cheerio.load(this.htmlContent);
   
    // Extract CSS from style tags
    $('style').each((i, elem) => {
        this.cssContent += $(elem).html() + '\n';
        $(elem).remove();
    });


    // Remove style attributes (handle them separately if needed)
    $('[style]').removeAttr('style');


    // Get clean HTML content
    this.htmlContent = $.html();
}


  serializeReactElement(element, indent = 2) {
    if (typeof element === 'string') return element;
    if (!element) return '';
    if (Array.isArray(element)) {
      return element.map(child => this.serializeReactElement(child, indent)).join('\n');
    }


    const { type, props } = element;
    const children = props.children || [];
    const propStrings = [];


    // Handle class to className conversion
    if (props.class) {
      propStrings.push(`className={styles.${props.class.replace(/\s+/g, ' ${styles.')}}`);
    }


    // Handle other props
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children' || key === 'class') continue;
     
      if (key === 'style' && typeof value === 'string') {
        const styleObj = {};
        value.split(';').forEach(rule => {
          const [prop, val] = rule.split(':').map(s => s.trim());
          if (prop && val) {
            const reactProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            styleObj[reactProp] = val;
          }
        });
        propStrings.push(`style={${JSON.stringify(styleObj)}}`);
        continue;
      }
     
      if (typeof value === 'string') {
        propStrings.push(`${key}="${value}"`);
      } else if (typeof value === 'boolean' && value) {
        propStrings.push(`${key}`);
      } else if (value !== null && value !== undefined) {
        propStrings.push(`${key}={${JSON.stringify(value)}}`);
      }
    }


    const propsString = propStrings.join(' ');
    const childrenString = this.serializeReactElement(children, indent + 2);


    if (childrenString.trim() === '') {
      return `<${type} ${propsString} />`;
    } else {
      return `<${type} ${propsString}>\n${' '.repeat(indent)}${childrenString}\n${' '.repeat(indent - 2)}</${type}>`;
    }
  }


  generateApp() {
    const appCode = `import React from 'react';
import './styles/global.css';
import ${this.componentName} from './components/${this.componentName}';


function App() {
  return (
    <div className="App">
      <${this.componentName} />
    </div>
  );
}


export default App;
`;


    const appPath = path.join(this.outputDir, 'src/App.js');
    fs.writeFileSync(appPath, appCode);
  }


  generateIndex() {
    const indexPath = path.join(this.outputDir, 'src/index.js');
    const indexCssPath = path.join(this.outputDir, 'src/styles/global.css');
   
    const indexCode = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;


    fs.writeFileSync(indexPath, indexCode);
    fs.writeFileSync(indexCssPath, this.cssContent);
  }


  generatePublicFiles() {
    const htmlPath = path.join(this.outputDir, 'public/index.html');
    const htmlCode = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MyMarket</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;


    fs.writeFileSync(htmlPath, htmlCode);


    // Copy placeholder images
    const placeholderImage = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    fs.writeFileSync(path.join(this.outputDir, 'public/images/placeholder.jpg'), placeholderImage);
  }


  generatePackageJson() {
    const isWindows = process.platform === 'win32';
    const startCommand = isWindows
        ? 'set DISABLE_ESLINT_PLUGIN=true && react-scripts start'
        : 'DISABLE_ESLINT_PLUGIN=true react-scripts start';


    const packageJson = {
        name: "mymarket",
        version: "1.0.0",
        private: true,
        dependencies: {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-scripts": "5.0.1",
            "html-to-react": "^1.4.3",
            "cheerio": "^1.0.0-rc.12"
        },
        scripts: {
            "start": startCommand,
            "build": "react-scripts build",
            "test": "react-scripts test",
            "eject": "react-scripts eject"
        },
        eslintConfig: {
            extends: [
                "react-app",
                "react-app/jest"
            ]
        }
    };


    const packagePath = path.join(this.outputDir, 'package.json');
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
}


  generateCssFile() {
    const cssPath = path.join(this.outputDir, 'src/styles/Marketplace.module.css');
    fs.writeFileSync(cssPath, this.cssContent);
  }


  async installDependencies() {
    try {
      process.chdir(this.outputDir);
      execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to install dependencies automatically');
      console.log('You can manually install them by running:');
      console.log(`1. cd ${this.outputDir}`);
      console.log('2. npm install');
    }
  }


  async startReactApp() {
    try {
      process.chdir(this.outputDir);
      spawn('npm', ['start'], { stdio: 'inherit', shell: true });
    } catch (error) {
      console.error('Failed to start React app');
    }
  }


  async convert() {
    try {
      console.log('🔄 Starting conversion...');
      this.readHtmlFile();
      this.extractContentFromHtml();
      this.createProjectStructure();
      this.generateReactFiles();
     
      await this.installDependencies();
     
      console.log('\n🎉 Conversion successful!');
      console.log('To run your React app:');
      console.log(`1. cd ${this.outputDir}`);
      console.log('2. npm start');
     
    } catch (error) {
      console.error('\n❌ Conversion failed:', error.message);
      console.log('Last resort fallback component was generated.');
      console.log('Try these fixes:');
      console.log('1. Check your HTML file for validity');
      console.log('2. Simplify complex HTML structures');
      console.log('3. Report the issue with your HTML sample');
    }
  }
}


// CLI execution with better error reporting
try {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    throw new Error('Usage: node html-to-react-converter.js <input.html> <output-dir>');
  }
 
  const converter = new HTMLToReactConverter(args[0], args[1]);
  converter.convert();
} catch (error) {
  console.error('🚨 Fatal error:', error.message);
  process.exit(1);
}
