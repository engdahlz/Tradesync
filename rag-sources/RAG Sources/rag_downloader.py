"""
RAG Source Downloader
Automatiskt skript för att ladda ner 93 källor för RAG-databas.
"""

import os
import re
import time
import logging
from pathlib import Path
from urllib.parse import urlparse, unquote
from datetime import datetime

import requests
from bs4 import BeautifulSoup

# Konfigurera loggning
BASE_DIR = Path(__file__).parent
DOWNLOADS_DIR = BASE_DIR / "downloads"
LOG_FILE = BASE_DIR / "download_log.txt"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Skapa mappstruktur
DIRS = {
    'pdfs': DOWNLOADS_DIR / 'pdfs',
    'articles': DOWNLOADS_DIR / 'articles',
    'datasets': DOWNLOADS_DIR / 'datasets',
    'github': DOWNLOADS_DIR / 'github',
}

for dir_path in DIRS.values():
    dir_path.mkdir(parents=True, exist_ok=True)

# Headers för att undvika blockering
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# Alla 93 källänkar
SOURCES = [
    "https://www.edelweissmf.com/Files/Insigths/booksummary/pdf/EdelweissMF_BookSummary_TheIntelligentInvestor.pdf",
    "https://www.investopedia.com/articles/07/ben_graham.asp",
    "https://readingraphics.com/book-summary-the-intelligent-investor/",
    "https://public.summaries.com/files/1-page-summary/the-intelligent-investor.pdf",
    "https://www.scribd.com/document/445195689/SECURITY-ANALYSIS",
    "https://www.shortform.com/pdf/security-analysis-pdf-benjamin-graham-and-david-dodd",
    "https://www.cfauk.org/-/media/files/pdf/pdf/10-brandes/2017-brandes-essay-winner.pdf",
    "https://glenbradford.com/files/Stocks/security-analysis-benjamin-graham-6th-edition-pdf-february-24-2010-12-08-am-3-0-meg.pdf",
    "https://cdn.bookey.app/files/pdf/book/en/the-theory-of-investment-value.pdf",
    "https://archive.org/details/in.ernet.dli.2015.225177",
    "https://sobrief.com/lists/top-10-must-read-books-on-quantitative-trading",
    "https://www.edelweissmf.com/Files/Insigths/booksummary/pdf/EdelweissMF_CommonStocks.pdf",
    "https://www.theinvestorspodcast.com/billionaire-book-club-executive-summary/common-stocks-and-uncommon-profits/",
    "https://www.scribd.com/document/915177594/Summary-common-Stocks-Uncommon-Profits",
    "https://www.myquant.cn/uploads/default/original/1X/4c7037365a4bf1623734c1c899baed7855061ace.pdf",
    "https://www.pyquantnews.com/the-pyquant-newsletter/46-books-quant-finance-algo-trading-market-data",
    "https://www.quantstart.com/articles/Top-5-Essential-Beginner-Books-for-Algorithmic-Trading/",
    "https://www.quantstart.com/articles/Quantitative-Finance-Reading-List/",
    "https://quantpedia.com/links-tools/?category=education-books",
    "https://medium.com/@mlblogging.k/10-awesome-books-for-quantitative-trading-fc0d6aa7e6d8",
    "https://www.shortform.com/pdf/the-new-market-wizards-pdf-jack-d-schwager",
    "https://www.scribd.com/document/906549777/Market-Wizards-Summary-1",
    "https://traderlion.com/trading-books/market-wizards/",
    "https://www.stockbrokers.com/guides/best-stock-trading-books",
    "https://www.shortform.com/pdf/a-random-walk-down-wall-street-pdf-burton-g-malkiel",
    "http://digitallibrary.loyolacollegekerala.edu.in:8080/jspui/bitstream/123456789/2075/1/A%20Random%20Walk%20Down%20Wall%20Street_%20The%20Time-Tested%20Strategy%20for%20Successful%20Investing.pdf",
    "https://fourminutebooks.com/a-random-walk-down-wall-street-summary/",
    "https://www.scribd.com/document/885756892/Trading-in-the-Zone-Summary",
    "https://nordfx.com/traders-guide/trading-in-the-zone-pdf",
    "https://readingraphics.com/book-summary-trading-in-the-zone/",
    "https://www.bauer.uh.edu/rsusmel/phd/jegadeesh-titman93.pdf",
    "https://www.nber.org/system/files/working_papers/w7159/w7159.pdf",
    "https://economics.yale.edu/sites/default/files/2024-05/Zhu_Pairs_Trading.pdf",
    "https://www.nber.org/papers/w7032",
    "https://stein.scholars.harvard.edu/publications/unified-theory-underreaction-momentum-trading-and-overreaction-asset-markets",
    "https://www.nber.org/system/files/working_papers/w6324/w6324.pdf",
    "https://econpapers.repec.org/RePEc:taf:quantf:v:10:y:2010:i:7:p:761-782",
    "https://www.researchgate.net/publication/227623962_Statistical_Arbitrage_in_the_US_Equities_Market",
    "https://www.semanticscholar.org/paper/A-Non-Random-Walk-Down-Wall-Street-Lo-Mackinlay/cb40cc3c2039e68dd794e93d561cdafc0ec3ef7e",
    "https://www.scribd.com/document/334580527/Front",
    "https://huggingface.co/datasets/sweatSmile/FinanceQA",
    "https://huggingface.co/datasets/eloukas/edgar-corpus",
    "https://huggingface.co/datasets/sujet-ai/Sujet-Financial-RAG-EN-Dataset/blame/0ca12d39b80f423ade352e349f59ef403c45d79a/data/train-00000-of-00001.parquet",
    "https://huggingface.co/datasets/anhaltai/fincorpus-de-10k",
    "https://www.investopedia.com/terms/g/goldencross.asp",
    "https://capital.com/en-int/learn/trading-strategies/golden-cross-trading-strategy",
    "https://www.chartguys.com/articles/golden-cross-trading",
    "https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/moving-average-trading-strategies/trading-the-death-cross",
    "https://thetradinganalyst.com/death-cross/",
    "https://dranolia.medium.com/@offline-pixel/top-5-pine-script-strategies-that-everyone-should-know-eb27cc72afc3",
    "https://www.luxalgo.com/blog/bollinger-bands-and-macd-entry-rules-explained/",
    "https://www.quantvps.com/blog/top-7-pine-script-strategies",
    "https://www.icfmindia.com/blog/using-rsi-macd-and-bollinger-bands-together-in-trading",
    "https://www.thinkmarkets.com/en/trading-academy/indicators-and-patterns/adx-indicator-how-it-works-trend-strength-signals-and-trading-strategies/",
    "https://www.investopedia.com/articles/trading/07/adx-trend-indicator.asp",
    "https://medium.com/@FMZQuant/strong-trend-adx-momentum-filtered-entry-quantitative-trading-strategy-0ae42cffd566",
    "https://medium.com/@redsword_23261/rsi-macd-bollinger-bands-and-volume-based-hybrid-trading-strategy-fb1ecfd58e1b",
    "https://www.luxalgo.com/blog/mean-reversion-trading-fading-extremes-with-precision/",
    "https://www.investopedia.com/terms/r/rsi.asp",
    "https://www.equiti.com/sc-en/news/trading-ideas/stochastic-oscillator-a-comprehensive-guide/",
    "https://www.swastika.co.in/blog/intraday-trading-using-rsi-macd-and-bollinger-bands",
    "https://www.cmcmarkets.com/en-gb/technical-analysis/what-is-a-stochastic-indicator",
    "https://www.ig.com/en/trading-strategies/a-trader_s-guide-to-the-stochastic-oscillator-190624",
    "https://www.warriortrading.com/vwap/",
    "https://capital.com/en-eu/learn/technical-analysis/volume-weighted-average-price-vwap-indicator",
    "https://www.youtube.com/watch?v=1HFoStW_wsc",
    "https://www.youtube.com/watch?v=tPNPT_T6ujk",
    "https://www.quantifiedstrategies.com/on-balance-volume-strategy/",
    "https://www.kavout.com/market-lens/decode-market-moves-with-obv-how-to-track-volume-like-a-pro-trader",
    "https://deepvue.com/indicators/on-balance-volume-obv/",
    "https://www.thinkmarkets.com/ae/trading-academy/indicators-and-patterns/bullish-bearish-engulfing-patterns/",
    "https://www.investopedia.com/terms/b/bullishengulfingpattern.asp",
    "https://www.chartguys.com/candlestick-patterns/hammer-candlestick-pattern",
    "https://volity.io/forex/hammer-candlestick-pattern/",
    "https://www.litefinance.org/blog/for-beginners/how-to-read-candlestick-chart/three-white-soldiers-pattern/",
    "https://www.xs.com/en/blog/three-white-soldiers/",
    "https://capital.com/en-eu/learn/trading-strategies/inside-bar-trading-strategy",
    "https://www.luxalgo.com/blog/inside-bar-breakouts-tight-risk-big-reward/",
    "https://capital.com/en-int/learn/trading-strategies/pivot-point-trading",
    "https://www.fxpro.com/help-section/education/beginners/articles/trading-strategies-using-pivot-points-reversal-points",
    "https://tradingstrategyguides.com/best-ichimoku-strategy/",
    "https://chartschool.stockcharts.com/table-of-contents/trading-strategies-and-models/trading-strategies/ichimoku-cloud-trading-strategies",
    "https://www.kaggle.com/datasets/borismarjanovic/price-volume-data-for-all-us-stocks-etfs",
    "https://www.kaggle.com/datasets/yash16jr/s-and-p500-daily-update-dataset",
    "https://www.kaggle.com/datasets/ibrahimqasimi/nvidia",
    "https://github.com/topics/historical-stock-data",
    "https://github.com/datasets/nasdaq-listings/blob/master/data/nasdaq-listed.csv",
    "https://github.com/itsmarmot/stockPrice-forecasting/blob/main/README.md",
    "https://www.cryptodatadownload.com/",
    "https://support.kraken.com/articles/360047124832-downloadable-historical-ohlcvt-open-high-low-close-volume-trades-data",
    "https://ieeexplore.ieee.org/iel8/6287639/10380310/10792442.pdf",
    "https://arxiv.org/html/2511.12120v1",
    "https://openfin.engineering.columbia.edu/sites/default/files/content/publications/ensemble.pdf",
]


def sanitize_filename(name: str) -> str:
    """Rensa filnamn från ogiltiga tecken."""
    name = unquote(name)
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = name[:200]  # Begränsa längd
    return name.strip()


def get_filename_from_url(url: str, default_ext: str = '.txt') -> str:
    """Extrahera filnamn från URL."""
    parsed = urlparse(url)
    path = parsed.path.rstrip('/')
    
    if path:
        filename = path.split('/')[-1]
        if filename and '.' in filename:
            return sanitize_filename(filename)
    
    # Skapa filnamn från domän och path
    domain = parsed.netloc.replace('www.', '').replace('.', '_')
    path_part = parsed.path.replace('/', '_')[:50]
    return sanitize_filename(f"{domain}{path_part}{default_ext}")


def is_pdf_url(url: str) -> bool:
    """Kontrollera om URL pekar på en PDF."""
    return url.lower().endswith('.pdf') or '/pdf/' in url.lower()


def is_huggingface_dataset(url: str) -> bool:
    """Kontrollera om URL är ett Hugging Face dataset."""
    return 'huggingface.co/datasets' in url


def is_github_url(url: str) -> bool:
    """Kontrollera om URL är från GitHub."""
    return 'github.com' in url


def is_kaggle_url(url: str) -> bool:
    """Kontrollera om URL är från Kaggle."""
    return 'kaggle.com' in url


def is_youtube_url(url: str) -> bool:
    """Kontrollera om URL är från YouTube."""
    return 'youtube.com' in url or 'youtu.be' in url


def download_pdf(url: str, index: int) -> bool:
    """Ladda ner en PDF-fil."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        response.raise_for_status()
        
        filename = f"{index:03d}_{get_filename_from_url(url, '.pdf')}"
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        
        filepath = DIRS['pdfs'] / filename
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logger.info(f"✓ PDF sparad: {filename}")
        return True
    except Exception as e:
        logger.error(f"✗ Kunde inte ladda ner PDF {url}: {e}")
        return False


def scrape_article(url: str, index: int) -> bool:
    """Scrapa text från en webbsida."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')
        
        # Ta bort script, style, nav, footer, ads
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
            element.decompose()
        
        # Försök hitta huvudinnehåll
        main_content = soup.find('article') or soup.find('main') or soup.find('div', class_=re.compile(r'content|article|post|entry'))
        
        if main_content:
            text = main_content.get_text(separator='\n', strip=True)
        else:
            text = soup.get_text(separator='\n', strip=True)
        
        # Städa upp texten
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n\n'.join(lines)
        
        # Hämta titel
        title = soup.find('title')
        title_text = title.get_text(strip=True) if title else "Ingen titel"
        
        # Skapa filnamn
        filename = f"{index:03d}_{get_filename_from_url(url, '.txt')}"
        if not filename.endswith('.txt'):
            filename = filename.rsplit('.', 1)[0] + '.txt'
        
        filepath = DIRS['articles'] / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"KÄLLA: {url}\n")
            f.write(f"TITEL: {title_text}\n")
            f.write("=" * 80 + "\n\n")
            f.write(text)
        
        logger.info(f"✓ Artikel sparad: {filename}")
        return True
    except Exception as e:
        logger.error(f"✗ Kunde inte scrapa {url}: {e}")
        return False


def download_huggingface_dataset(url: str, index: int) -> bool:
    """Ladda ner info om Hugging Face dataset."""
    try:
        # Extrahera dataset-namn från URL
        match = re.search(r'huggingface\.co/datasets/([^/]+/[^/]+)', url)
        if not match:
            logger.warning(f"Kunde inte extrahera dataset-namn från {url}")
            return False
        
        dataset_name = match.group(1)
        
        # Spara dataset-referens (faktisk nedladdning kräver datasets-biblioteket)
        filename = f"{index:03d}_hf_{dataset_name.replace('/', '_')}.txt"
        filepath = DIRS['datasets'] / filename
        
        info_text = f"""HUGGING FACE DATASET
====================
URL: {url}
Dataset: {dataset_name}

För att ladda ner detta dataset, använd:

from datasets import load_dataset
dataset = load_dataset("{dataset_name}")

Eller via CLI:
huggingface-cli download {dataset_name}
"""
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(info_text)
        
        logger.info(f"✓ HuggingFace dataset-referens sparad: {filename}")
        return True
    except Exception as e:
        logger.error(f"✗ Fel med HuggingFace dataset {url}: {e}")
        return False


def download_github_file(url: str, index: int) -> bool:
    """Ladda ner fil från GitHub."""
    try:
        # Konvertera till raw URL om möjligt
        if 'github.com' in url and '/blob/' in url:
            raw_url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
        elif 'github.com' in url and '/topics/' in url:
            # Topics-sida - scrapa som artikel
            return scrape_article(url, index)
        else:
            raw_url = url
        
        response = requests.get(raw_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        filename = f"{index:03d}_{get_filename_from_url(url)}"
        filepath = DIRS['github'] / filename
        
        # Bestäm om binär eller text
        content_type = response.headers.get('content-type', '')
        if 'text' in content_type or filename.endswith(('.md', '.txt', '.csv', '.json', '.py')):
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"KÄLLA: {url}\n")
                f.write("=" * 80 + "\n\n")
                f.write(response.text)
        else:
            with open(filepath, 'wb') as f:
                f.write(response.content)
        
        logger.info(f"✓ GitHub-fil sparad: {filename}")
        return True
    except Exception as e:
        logger.error(f"✗ Kunde inte ladda ner GitHub-fil {url}: {e}")
        return False


def handle_kaggle(url: str, index: int) -> bool:
    """Spara Kaggle dataset-referens."""
    try:
        # Extrahera dataset-namn
        match = re.search(r'kaggle\.com/datasets/([^/]+/[^/?]+)', url)
        dataset_name = match.group(1) if match else "unknown"
        
        filename = f"{index:03d}_kaggle_{dataset_name.replace('/', '_')}.txt"
        filepath = DIRS['datasets'] / filename
        
        info_text = f"""KAGGLE DATASET
==============
URL: {url}
Dataset: {dataset_name}

För att ladda ner detta dataset, använd Kaggle CLI:

kaggle datasets download -d {dataset_name}

Eller ladda ner manuellt från webbplatsen.
OBS: Kräver Kaggle API-nycklar konfigurerade.
"""
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(info_text)
        
        logger.info(f"✓ Kaggle dataset-referens sparad: {filename}")
        return True
    except Exception as e:
        logger.error(f"✗ Fel med Kaggle dataset {url}: {e}")
        return False


def handle_youtube(url: str, index: int) -> bool:
    """Spara YouTube-videoreferens."""
    try:
        filename = f"{index:03d}_youtube_video.txt"
        filepath = DIRS['articles'] / filename
        
        info_text = f"""YOUTUBE VIDEO
=============
URL: {url}

YouTube-videor kan inte automatiskt transkriberas utan ytterligare verktyg.
Överväg att använda:
- YouTube's automatiska undertexter
- whisper (OpenAI) för transkribering
- youtube-transcript-api för att hämta befintliga undertexter
"""
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(info_text)
        
        logger.info(f"✓ YouTube-referens sparad: {filename}")
        return True
    except Exception as e:
        logger.error(f"✗ Fel med YouTube {url}: {e}")
        return False


def download_source(url: str, index: int) -> bool:
    """Huvudfunktion för att ladda ner en källa baserat på typ."""
    logger.info(f"\n[{index}/{len(SOURCES)}] Bearbetar: {url[:80]}...")
    
    if is_youtube_url(url):
        return handle_youtube(url, index)
    elif is_pdf_url(url):
        return download_pdf(url, index)
    elif is_huggingface_dataset(url):
        return download_huggingface_dataset(url, index)
    elif is_kaggle_url(url):
        return handle_kaggle(url, index)
    elif is_github_url(url):
        return download_github_file(url, index)
    else:
        return scrape_article(url, index)


def main():
    """Huvudprogram."""
    logger.info("=" * 80)
    logger.info(f"RAG Source Downloader startar - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Totalt antal källor: {len(SOURCES)}")
    logger.info("=" * 80)
    
    success_count = 0
    failed_urls = []
    
    for i, url in enumerate(SOURCES, 1):
        try:
            if download_source(url, i):
                success_count += 1
            else:
                failed_urls.append((i, url))
        except Exception as e:
            logger.error(f"Oväntat fel för {url}: {e}")
            failed_urls.append((i, url))
        
        # Paus mellan förfrågningar för att undvika blockering
        time.sleep(1.5)
    
    # Sammanfattning
    logger.info("\n" + "=" * 80)
    logger.info("SAMMANFATTNING")
    logger.info("=" * 80)
    logger.info(f"Lyckade nedladdningar: {success_count}/{len(SOURCES)}")
    logger.info(f"Misslyckade: {len(failed_urls)}")
    
    if failed_urls:
        logger.info("\nMisslyckade länkar:")
        for idx, url in failed_urls:
            logger.info(f"  [{idx}] {url}")
    
    logger.info(f"\nFiler sparade i: {DOWNLOADS_DIR}")
    logger.info("Klar!")


if __name__ == "__main__":
    main()
