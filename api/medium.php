<?php
/**
 * Feed do Medium (@eduaraujosa) → JSON para a seção Lifestyle.
 *
 * - Busca SOMENTE a URL fixa do feed (não é um proxy: qualquer parâmetro na URL é recusado).
 * - Cache em arquivo (cache/medium.json) por 1 hora; se o Medium falhar, serve o último cache.
 * - Sem cache e sem feed: responde 200 com { items: [], erro: "..." }.
 * - Compatível com PHP 7.4+.
 */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);

const FEED_URL      = 'https://medium.com/feed/@eduaraujosa';
const QUANTIDADE    = 3;
const VALIDADE_S    = 3600;
const TIMEOUT_S     = 6;
const USER_AGENT    = 'eduaraujosa.com.br/medium-feed (+https://eduaraujosa.com.br/)';
const HOSTS_MINIATURA = ['cdn-images-1.medium.com', 'miro.medium.com'];
const HOSTS_LINK      = ['medium.com', 'eduaraujosa.medium.com'];

$arquivoCache = __DIR__ . '/cache/medium.json';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function responder(array $dados, int $status = 200, string $origem = 'feed'): void
{
    http_response_code($status);
    header('X-Medium-Origem: ' . $origem);
    if ($status === 200 && $origem !== 'indisponivel') {
        header('Cache-Control: public, max-age=600');
    } else {
        header('Cache-Control: no-store');
    }
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Só GET/HEAD, sem nenhum parâmetro.
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($metodo !== 'GET' && $metodo !== 'HEAD') {
    header('Allow: GET, HEAD');
    responder(['items' => [], 'erro' => 'Método não permitido.'], 405, 'recusado');
}
if (!empty($_GET) || (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '')) {
    responder(['items' => [], 'erro' => 'Este endpoint não aceita parâmetros.'], 400, 'recusado');
}

function lerCache(string $arquivo): ?array
{
    if (!is_file($arquivo)) {
        return null;
    }
    $json = @file_get_contents($arquivo);
    if ($json === false) {
        return null;
    }
    $dados = json_decode($json, true);
    return (is_array($dados) && isset($dados['items']) && is_array($dados['items'])) ? $dados : null;
}

function gravarCache(string $arquivo, array $dados): void
{
    $dir = dirname($arquivo);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $tmp = $arquivo . '.' . bin2hex(random_bytes(4)) . '.tmp';
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
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => TIMEOUT_S,
            CURLOPT_TIMEOUT        => TIMEOUT_S,
            CURLOPT_USERAGENT      => USER_AGENT,
            CURLOPT_HTTPHEADER     => ['Accept: application/rss+xml, application/xml;q=0.9, */*;q=0.1'],
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $corpo = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        return ($corpo !== false && $status === 200 && $corpo !== '') ? (string) $corpo : null;
    }

    $ctx = stream_context_create([
        'http' => [
            'method'        => 'GET',
            'timeout'       => TIMEOUT_S,
            'user_agent'    => USER_AGENT,
            'header'        => "Accept: application/rss+xml, application/xml;q=0.9, */*;q=0.1\r\n",
            'ignore_errors' => true,
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $corpo = @file_get_contents(FEED_URL, false, $ctx);
    $status = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $linha) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $linha, $m)) {
                $status = (int) $m[1];
            }
        }
    }
    return ($corpo !== false && $status === 200 && $corpo !== '') ? $corpo : null;
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
    if ($html === '' || !preg_match_all('/<img\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\']/i', $html, $m)) {
        return null;
    }
    foreach ($m[1] as $src) {
        $src = html_entity_decode($src, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (hostPermitido($src, HOSTS_MINIATURA)) {
            return $src;
        }
    }
    return null;
}

function interpretarFeed(string $xml): ?array
{
    libxml_use_internal_errors(true);
    $rss = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA | LIBXML_NONET);
    libxml_clear_errors();
    if ($rss === false || !isset($rss->channel)) {
        return null;
    }

    $itens = [];
    foreach ($rss->channel->item as $item) {
        $titulo = trim((string) $item->title);
        $link = trim((string) $item->link);
        $link = strtok($link, '?') ?: '';
        if ($titulo === '' || !hostPermitido($link, HOSTS_LINK)) {
            continue;
        }

        $data = null;
        $ts = strtotime((string) $item->pubDate);
        if ($ts !== false) {
            $data = gmdate('Y-m-d\TH:i:s\Z', $ts);
        }

        $conteudo = $item->children('http://purl.org/rss/1.0/modules/content/');
        $html = isset($conteudo->encoded) ? (string) $conteudo->encoded : '';

        $itens[] = [
            'titulo'    => $titulo,
            'link'      => $link,
            'data'      => $data,
            'miniatura' => extrairMiniatura($html),
        ];
        if (count($itens) >= QUANTIDADE) {
            break;
        }
    }
    return $itens;
}

// 1. Cache ainda válido
$cache = lerCache($arquivoCache);
if ($cache !== null && is_file($arquivoCache) && (time() - (int) filemtime($arquivoCache)) < VALIDADE_S) {
    responder(['items' => $cache['items']], 200, 'cache');
}

// 2. Feed do Medium
$xml = baixarFeed();
$itens = $xml !== null ? interpretarFeed($xml) : null;
if (is_array($itens)) {
    $dados = ['items' => $itens, 'atualizado' => gmdate('Y-m-d\TH:i:s\Z')];
    gravarCache($arquivoCache, $dados);
    responder(['items' => $itens], 200, 'feed');
}

// 3. Falhou: último cache, mesmo vencido
if ($cache !== null) {
    responder(['items' => $cache['items']], 200, 'cache-vencido');
}

// 4. Nada disponível
responder(['items' => [], 'erro' => 'Não foi possível obter o feed do Medium.'], 200, 'indisponivel');
