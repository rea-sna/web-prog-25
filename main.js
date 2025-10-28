// main.js

const DATA_TYPES = {
    言語: "string",
    主な用途: "string",
    人気度: "number",
    難易度: "category"
};

const numeralColumns = {};
const categoricalColumns = {};

// DOMのロードが完了したら実行する関数
document.addEventListener("DOMContentLoaded", function () {
    // CSVファイルを読み込んでパースする
    fetch("./myhobbies.csv")
        .then(function (response) {
            return response.text(); // レスポンスをテキスト形式で取得
        })
        .then(function (data) {
            const records = parseCSV(data); // CSVデータをパースして配列に変換
            const elements = createTableContents(records); // パースされたデータでHTMLテーブルを生成
            const master = document.getElementById("master"); // テーブルを配置する要素を取得
            const table = master.querySelector("table");
            table.append(...elements); // テーブルにヘッダーとデータ行を追加

            // 検索機能
            const tbody = elements[1];
            const input = master.querySelector("input");
            input.addEventListener("input", function () {
                const keyword = input.value;
                while (tbody.firstChild) {
                    tbody.removeChild(tbody.firstChild);
                }
                createTableBodyRows(tbody, records, keyword);
            });
            createStatusUI(records);
        });

    // 詳細画面の「戻る」ボタンにイベントリスナーを追加
    document.querySelector("#detail > button").addEventListener("click", () => {
        document.body.classList.remove("-showdetail"); // 詳細画面を非表示にする
    });
});

function createStatusUI(records) {
    const selector = document.querySelector("#master > .stats > .selector");
    for (const key in DATA_TYPES) {
        if (DATA_TYPES[key] === "category") {
            const li = document.createElement("li");
            li.textContent = key;
            selector.append(li);

            const column = categoricalColumns[key];
            const counts = {};
            for (const value of column) {
                counts[value] = 0;
            }

            for (const record of records) {
                counts[record[key]]++;
            }

            li.addEventListener("click", () => {
                drawGraph(counts);
            });

            console.log(counts);
        }
    }

}

function drawGraph(values) {
    const BAR_WIDTH = 10;
    const PADDING_TOP = 10; // グラフの上部に空ける余白
    const PADDING_BOTTOM = 60; // グラフの下部に空ける余白（ラベル用）
    const graphContainer = document.querySelector("#master > .stats > .graph");
    const rect = graphContainer.getBoundingClientRect(); // コンテナのサイズを取得
    const barMaxHeight = rect.height - PADDING_TOP - PADDING_BOTTOM; // バーの最大高さを計算（余白を除く）
    const max = Math.max(...Object.values(values)); // valuesオブジェクト内の最大値を取得
    const heightUnit = barMaxHeight / max; // バーの高さを最大値に基づいて単位化
    const keys = Object.keys(values);
    const widthUnit = 1 / (keys.length + 1);

    while (graphContainer.firstChild) {
        graphContainer.removeChild(graphContainer.firstChild);
    }

    for (var i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[key];

        const div = document.createElement("div");
        div.style.left = `calc(${(i + 1) * widthUnit * 100}% - ${BAR_WIDTH - 0.5}px)`;
        div.style.height = `${value * heightUnit}px`;
        div.className = "bar";
        graphContainer.append(div);

        const label = document.createElement("div"); // ラベル用のdiv要素を作成
        label.textContent = key; // ラベルにカテゴリ名を設定
        label.className = "label"; // ラベルのCSSクラスを設定
        div.append(label); // ラベルをバーに追加
    }

}

// CSVデータをパースして連想配列の配列に変換する関数
function parseCSV(data) {
    // BOM（Byte Order Mark）を削除
    data = data.replace(/^\uFEFF/, '');
    // CSVを改行で分割して各行を配列として扱う
    const rows = data.split("\n");
    // 最初の行（ヘッダー）をカンマで分割してカラム名を取得
    const headers = rows[0].split(",").map(header => header.trim());

    // データ行をオブジェクトとして格納する配列
    const records = [];

    // 2行目以降のデータ行をループで処理
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(",").map(value => value.trim()); // 行をカンマで分割して各列の値を取得
        if (values.length === 1 && values[0] === "") {
            continue; // 空行をスキップ
        }
        let record = {}; // データを格納するオブジェクトを作成
        for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = values[j]; // ヘッダーをキーにして値をオブジェクトに格納
        }
        records.push(record); // 作成したオブジェクトを配列に追加
    }

    console.log("Headers:", headers);
    console.log("Records:", records);

    for (const key in DATA_TYPES) {
        if (DATA_TYPES[key] === "number") {
            const nums = records.map((record) => Number(record[key]));

            numeralColumns[key] = {
                min: Math.min(...nums),
                max: Math.max(...nums)
            };
        }

        if (DATA_TYPES[key] === "category") {
            // records配列の各レコードに対して、指定されたフィールドの値を取得
            // Setオブジェクトを使って重複を排除し、categoricalColumnsオブジェクトに格納
            const values = records.map((record) => record[key]);
            console.log(`Category "${key}" values:`, values);
            categoricalColumns[key] = Array.from(new Set(values));
        }
    }
    console.log("categoricalColumns:", categoricalColumns);

    return records; // 連想配列の配列を返す
}

// パースされたCSVデータからHTMLテーブルを生成する関数
function createTableContents(records) {
    // テーブルのヘッダー行を作成
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (let key in records[0]) {
        const th = document.createElement("th");
        th.textContent = key; // 各ヘッダーセルにカラム名を設定
        th.dataset.type = DATA_TYPES[key]; // データタイプをdata-type属性に設定
        th.addEventListener("click", function () {
            setSort(th, records);
        });
        headerRow.append(th); // ヘッダー行にセルを追加
    }
    thead.append(headerRow); // theadにヘッダー行を追加

    // テーブルのデータ行を作成
    const tbody = document.createElement("tbody");
    createTableBodyRows(tbody, records); // データ行をtbodyに追加

    return [thead, tbody]; // theadとtbodyを配列として返す
}

// 詳細画面にクリックした行のデータを表示する関数
function showDetail(record) {
    // body要素にクラスを追加して詳細画面を表示
    document.body.classList.add("-showdetail");
    const detail = document.querySelector("#detail > .container");

    // 既存の詳細内容をクリア
    while (detail.firstChild) {
        detail.removeChild(detail.firstChild);
    }

    // 各データ項目を表示
    for (const key in record) {
        const dl = document.createElement("dl");
        const dt = document.createElement("dt");
        dt.textContent = key; // データのキー（ヘッダー名）を表示
        const dd = document.createElement("dd");
        dd.textContent = record[key]; // データの値を表示
        dl.append(dt, dd); // dtとddを詳細表示のリストに追加
        detail.append(dl); // 詳細コンテナにリストを追加
    }
}


function setSort(th, records) {
    switch (th.dataset.sortOrder) {
        case undefined:
            th.dataset.sortOrder = "asc";
            break;
        case "asc":
            th.dataset.sortOrder = "desc";
            break;
        case "desc":
            delete th.dataset.sortOrder;
            break;
    }
    console.log(th);

    // th の兄弟要素を取得しソートを初期化
    const siblings = th.parentNode.children;
    for (let sibling of siblings) {
        if (sibling !== th) {
            delete sibling.dataset.sortOrder;
        }
    }

    const key = th.textContent;
    const type = th.dataset.type;
    const copiedRecords = [...records];

    if (th.dataset.sortOrder !== undefined) {
        copiedRecords.sort((a, b) => {
            let aValue = a[key];
            let bValue = b[key];

            switch (type) {
                case "string":
                case "category":
                    return aValue.localeCompare(bValue);
                case "number":
                    return aValue - bValue;
            }
        });
    }

    if (th.dataset.sortOrder === "desc") {
        copiedRecords.reverse();
    }

    console.log(copiedRecords);

    const tbody = th.closest("table").querySelector("tbody");
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    createTableBodyRows(tbody, copiedRecords);
}

function createTableBodyRows(tbody, records, keyword) {
    for (let record of records) {
        const tr = document.createElement("tr");

        if (keyword) {
            let isMatch = false;
            for (const key in record) {
                if (record[key].includes(keyword)) {
                    isMatch = true;
                    break;
                }
            }
            if (!isMatch) {
                continue;
            }
        }
        for (let key in record) {
            const td = document.createElement("td");
            td.textContent = record[key]; // 各データセルに値を設定
            const text = record[key];

            if (keyword) {
                const regexp = new RegExp(keyword, "g");
                const replaced = text.replace(regexp, (match) => {
                    return `<mark>${match}</mark>`;
                });
                td.innerHTML = replaced; // ハイライトを反映させるためにinnerHTMLを使用
            } else {
                td.textContent = text;
            }

            // 数値型の場合、最大値と最小値を元に色付け
            if (DATA_TYPES[key] === "number") {
                const column = numeralColumns[key];
                const ratio = (Number(text) - column.min) / (column.max - column.min);
                td.style.backgroundColor = `rgba(255, 196, 196, ${ratio})`; // 背景色を設定
            }

            // 範疇型の場合、カテゴリごとに色付け
            if (DATA_TYPES[key] === "category") {
                const column = categoricalColumns[key];
                console.log(column);
                const index = column.indexOf(text);
                console.log(index);
                const hue = (360 / column.length) * index;
                td.style.backgroundColor = `hsl(${hue}, 80%, 90%)`; // 背景色を設定
            }

            tr.append(td); // データ行にセルを追加
        }
        // 行をクリックしたときに詳細表示を呼び出すイベントリスナーを追加
        tr.addEventListener("click", function (event) {
            showDetail(record); // クリックされた行のデータを詳細表示
        });
        tbody.append(tr); // tbodyにデータ行を追加
    }
}