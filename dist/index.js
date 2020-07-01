"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = require("http");
var https_1 = require("https");
var node_html_parser_1 = require("node-html-parser");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
try {
    fs_1.default.writeFileSync(path_1.default.resolve(__dirname, "../data/data.json"), "{\"version\": null}", { flag: "ax" });
}
catch (e) { }
var data = require("../data/data.json");
var config = require("../data/config.json");
function sendMessage(obj) {
    try {
        var body_1 = JSON.stringify(obj);
        config.webhooks.forEach(function (url) {
            var options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body_1)
                }
            };
            console.log(obj);
            var dreq = https_1.request(url, options);
            dreq.on("error", function (e) {
                console.error("Error with request: " + e.message);
            });
            dreq.on("data", function (res) {
                res.pipe(process.stdout);
            });
            dreq.on("end", function () {
                debugger;
            });
            dreq.write(body_1);
            dreq.end();
        });
    }
    catch (e) {
        console.log(e);
    }
}
var verreq = https_1.request("https://secure.byond.com/download/version.txt", function (res) {
    var byondver = "";
    res.setEncoding("utf8");
    res.on("data", function (chunk) {
        byondver += chunk;
    });
    res.on("end", function () {
        if (!res.complete) {
            console.error("Response is not complete");
            return;
        }
        byondver = byondver.trim(); //yeets the newline at the end
        console.log(byondver);
        if (data.version === byondver) {
            console.log("Nothing to do");
            return;
        }
        var req = http_1.request("http://www.byond.com/docs/notes/513.html", function (res) {
            var content = "";
            res.setEncoding("utf8");
            res.on("data", function (chunk) {
                content += chunk;
            });
            res.on("end", function () {
                if (!res.complete) {
                    console.error("Response is not complete");
                    return;
                }
                console.time("HTMLParsing");
                var htmlschema = node_html_parser_1.parse(content /*.replace(/\n/g, "")*/);
                var children = htmlschema.querySelector("body").removeWhitespace().childNodes;
                children.shift(); //the first one is just the release notes header
                children.pop(); //the last one is just the footer for other release notes
                var builds = [];
                var currentbuild;
                var currentcat;
                var currentprogram;
                children.forEach(function (value) {
                    if (value.tagName === "h3") {
                        if (currentbuild) {
                            builds.push(currentbuild);
                        }
                        currentbuild = {
                            name: /Build (\d{3}\.\d{4})/.exec(value.text)[1],
                            categories: []
                        };
                    }
                    if (value.tagName === "p") {
                        if (value.childNodes.length === 4) {
                            currentcat = {
                                name: value.querySelector("u").text,
                                link: value.querySelector("a").getAttribute("href"),
                                programs: []
                            };
                            currentbuild.categories.push(currentcat);
                        }
                        else if (value.childNodes.length === 2) {
                            currentprogram = {
                                name: value.childNodes[0].text,
                                entries: []
                            };
                            value.childNodes[1].childNodes.forEach(function (ival) {
                                var innervalue = ival;
                                if (innervalue.tagName === "li") {
                                    //@ts-ignore
                                    currentprogram.entries.push(innervalue.structuredText);
                                }
                            });
                            currentcat.programs.push(currentprogram);
                        }
                    }
                });
                console.timeEnd("HTMLParsing");
                console.log(builds);
                data.version = byondver;
                fs_1.default.writeFileSync(path_1.default.resolve(__dirname, "../data/data.json"), JSON.stringify(data));
                var fields = [
                /*  {
                      name: "\u200b",
                      value: ""
                  },
                  {
                      name: "BYONDexe",
                      value: "\u25CF owo\n\u25CF uwu"
                  }*/
                ];
                var selectedbuild = builds[0];
                var embed = {
                    username: "BYOND Changelog",
                    avatar_url: "https://cdn.discordapp.com/icons/81104451930165248/395762b8f813342035d9db71e3b16f1c.webp",
                    content: "BYOND version " + selectedbuild.name + " released!",
                    embeds: [
                        {
                            title: "BYOND version " + selectedbuild.name,
                            url: "http://www.byond.com/download/",
                            timestamp: new Date().toISOString(),
                            fields: fields
                        }
                    ],
                    allowed_mentions: {
                        parse: []
                    }
                };
                selectedbuild.categories.forEach(function (cat) {
                    fields.push({
                        name: "\u200b",
                        value: "**__[" + cat.name + "](" + cat.link + ")__**"
                    });
                    cat.programs.forEach(function (prog) {
                        var entry = "\u25CF " + prog.entries.join("\n\u25CF ");
                        fields.push({
                            name: prog.name,
                            value: entry
                        });
                    });
                });
                sendMessage(embed);
            });
        });
        req.end();
    });
});
verreq.end();
//# sourceMappingURL=index.js.map