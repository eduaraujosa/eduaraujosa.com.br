<?php
/**
 * Feed do Medium → JSON, servido pelo próprio domínio.
 *
 * GET api/medium.php  →  { "items": [ { "titulo", "link", "data", "miniatura" } ] }
 *
 * - Busca SOMENTE a URL fixa abaixo (não aceita parâmetros: não é um proxy aberto).
 * - Cache em arquivo (api/cache/medium.json, protegido por .htaccess) com validade de 1 hora.
 * - Se o Medium falhar, serve o último cache válido; sem cache, responde { items: [], erro } com 200.
 * - Compatível com PHP 7.2 ou superior.
 */

declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

const FEED_URL     = 'https://medium.com/feed/@eduaraujosa';
const QUANTIDADE   = 3;
const VALIDADE_S   = 3600;
const TIMEOUT_S    = 6;
const USER_AGENT   = 'eduaraujosa.com.br/medium-feed (+https://eduaraujosa.com.br/)';
const HOSTS_LINK   = ['medium.com', 'eduaraujosa.medium.com'];
const HOSTS_IMAGEM = ['cdn-images-1.medium.com', 'miro.medium.com'];

$arquivoCache = __DIR__ . '/cache/medium.json';

function responder(int $status, array $corpo, string $origem): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=300');
    header('X-Feed-Origem: ' . $origem);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 1. Só GET/HEAD, sem nenhum parâmetro de URL.
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo !== 'GET' && $metodo !== 'HEAD') {
    header('Allow: GET, HEAD');
    responder(405, ['items' => [], 'erro' => 'método não permitido'], 'recusado');
}
if (!empty($_GET) || (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '')) {
    responder(400, ['items' => [], 'erro' => 'este endpoint não aceita parâmetros'], 'recusado');
}

function lerCache(string $arquivo): ?array
{
    if (!is_file($arquivo)) {
        return null;
    }
    $dados = json_decode((string) @file_get_contents($arquivo), true);
    return (is_array($dados) && isset($dados['items']) && is_array($dados['items'])) ? $dados : null;
}

function gravarCache(string $arquivo, array $dados): void
{
    $dir = dirname($arquivo);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $tmp = $arquivo . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) {
        @rename($tmp, $arquivo);
    } else {
        @unlink($tmp);
    }
}

function baixarFeed(): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init(FEED_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => TIMEOUT_S,
            CURLOPT_TIMEOUT        => TIMEOUT_S,
            CURLOPT_USERAGENT      => USER_AGENT,
            CURLOPT_HTTPHEADER     => ['Accept: application/rss+xml, application/xml;q=0.9, */*;q=0.1'],
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
        ]);
        $corpo = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ($corpo !== false && $status === 200) ? (string) $corpo : null;
    }

    $ctx = stream_context_create([
        'http' => [
            'method'          => 'GET',
            'timeout'         => TIMEOUT_S,
            'header'          => "User-Agent: " . USER_AGENT . "\r\nAccept: application/rss+xml, application/xml\r\n",
            'follow_location' => 0,
            'ignore_errors'   => true,
        ],
    ]);
    $corpo = @file_get_contents(FEED_URL, false, $ctx);
    $linhaStatus = isset($http_response_header[0]) ? $http_response_header[0] : '';
    return ($corpo !== false && preg_match('#\s200\s#', $linhaStatus)) ? (string) $corpo : null;
}

function hostPermitido(string $url, array $hosts): bool
{
    $partes = parse_url($url);
    return is_array($partes)
        && ($partes['scheme'] ?? '') === 'https'
        && in_array(strtolower($partes['host'] ?? ''), $hosts, true);
}

function extrairMiniatura(string $html): ?string
{
    if (!preg_match_all('/<img\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']/i', $html, $m)) {
        return null;
    }
    foreach ($m[1] as $src) {
        $src = html_entity_decode($src, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (hostPermitido($src, HOSTS_IMAGEM)) {
            return $src;
        }
    }
    return null;
}

function interpretarFeed(string $xmlBruto): ?array
{
    $anterior = libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlBruto, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
    libxml_clear_errors();
    libxml_use_internal_errors($anterior);
    if ($xml === false || !isset($xml->channel)) {
        return null;
    }

    $itens = [];
    foreach ($xml->channel->item as $item) {
        $titulo = trim(html_entity_decode((string) $item->title, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $link = trim((string) $item->link);
        $link = (string) strtok($link, '?'); // remove ?source=…
        $ts = strtotime((string) $item->pubDate);

        if ($titulo === '' || !hostPermitido($link, HOSTS_LINK) || $ts === false) {
            continue;
        }

        $conteudo = $item->children('http://purl.org/rss/1.0/modules/content/');
        $html = isset($conteudo->encoded) ? (string) $conteudo->encoded : '';

        $itens[] = [
            'titulo'    => $titulo,
            'link'      => $link,
            'data'      => gmdate('c', $ts),
            'miniatura' => extrairMiniatura($html),
        ];
        if (count($itens) >= QUANTIDADE) {
            break;
        }
    }
    return $itens;
}

// 2. Cache dentro da validade.
$cache = lerCache($arquivoCache);
if ($cache !== null && (time() - (int) @filemtime($arquivoCache)) < VALIDADE_S) {
    responder(200, ['items' => $cache['items']], 'cache');
}

// 3. Busca o feed.
$bruto = baixarFeed();
$itens = $bruto !== null ? interpretarFeed($bruto) : null;

if (is_array($itens)) {
    $dados = ['items' => $itens, 'atualizado' => gmdate('c')];
    gravarCache($arquivoCache, $dados);
    responder(200, ['items' => $itens], 'medium');
}

// 4. Falhou: último cache válido, mesmo vencido.
if ($cache !== null) {
    responder(200, ['items' => $cache['items']], 'cache-antigo');
}

responder(200, ['items' => [], 'erro' => 'feed indisponível no momento'], 'vazio');
