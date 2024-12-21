import type { Item, Category, LoginCredentials, AccountInfo } from '../../types/iptv';
import { M3uParser, M3uPlaylist } from 'm3u-parser-generator';
import Database from '@tauri-apps/plugin-sql';

export type AuthenticationStatus = {
    success: boolean;
    loading: boolean;
    message: string;
};

async function downloadPlaylist(
    credentials: LoginCredentials,
    onProgress?: (message: string, progress?: number) => void
): Promise<string> {
    onProgress?.('Fetching playlist...');

    const playlistUrl = `${credentials.server}/get.php?username=${credentials.username}&password=${credentials.password}&type=m3u_plus&output=ts`;
    const response = await fetch(playlistUrl);

    if (!response.ok) {
        throw new Error('Failed to fetch playlist');
    }

    const reader = response.body?.getReader();
    const contentLength = +(response.headers.get('Content-Length') ?? '0');

    if (!reader) {
        throw new Error('Failed to read response');
    }

    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (contentLength > 0) {
            const progress = Math.round((receivedLength / contentLength) * 100);
            onProgress?.(`Downloading playlist: ${progress}%`, progress);
        }
    }

    // Concatenate chunks into a single Uint8Array
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
    }

    // Convert to text
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(allChunks);
}

async function refreshData(
    credentials: LoginCredentials,
    onProgress?: (status: AuthenticationStatus) => void
): Promise<AuthenticationStatus> {
    try {
        const m3u_content = await downloadPlaylist(credentials, (message, _) => {
            onProgress?.({
                success: false,
                loading: true,
                message,
            });
        });

        if (onProgress) onProgress({ success: false, loading: true, message: 'Parsing playlist...' });
        const playlist = M3uParser.parse(m3u_content);

        if (onProgress) onProgress({ success: false, loading: true, message: 'Saving data to database...' });
        await saveData(playlist, (progress) => {
            if (onProgress) onProgress({
                success: false,
                loading: true,
                message: `Saving data: ${progress}`
            });
        });

        return {
            success: true,
            loading: false,
            message: 'Data refresh complete'
        };

    } catch (error) {
        console.error('Refresh error:', error);
        return {
            success: false,
            loading: false,
            message: error instanceof Error ? error.message : 'Failed to refresh data'
        };
    }
}

export async function authenticate(
    credentials: LoginCredentials,
    onProgress?: (status: AuthenticationStatus) => void
): Promise<AuthenticationStatus> {
    try {
        // First verify credentials by getting account info
        if (onProgress) onProgress({ success: false, loading: true, message: 'Verifying credentials...' });
        const accountInfo = await getAccountInfo(credentials);

        if (accountInfo.user_info.auth !== 1) {
            throw new Error('Invalid credentials');
        }

        await saveAccount(credentials);
        
        return refreshData(credentials, onProgress);

    } catch (error) {
        console.error('Authentication error:', error);
        return {
            success: false,
            loading: false,
            message: error instanceof Error ? error.message : 'Authentication failed'
        };
    }
}

// Export refreshData for use in other components
export { refreshData };

export async function getAccountInfo(credentials: LoginCredentials) {
    const result = await fetch(`${credentials.server}/player_api.php?username=${credentials.username}&password=${credentials.password}`);


    if (!result.ok) {

        console.log('Failed to fetch account info');

        throw new Error('Failed to fetch account info');
    }

    const data = await result.json();

    console.log('Account info:', data);

    return data as AccountInfo;
}

async function saveAccount(credentials: LoginCredentials) {

    const db = await Database.load("sqlite:iptv_data.db");

    console.log('Saving account to database');

    await db.execute(
        `INSERT INTO account (username, password, server) VALUES (?, ?, ?)`,
        [credentials.username, credentials.password, credentials.server]
    );

    console.log('Account saved to database');
}

async function saveData(
    playlist: M3uPlaylist,
    onProgress?: (progress: string) => void
) {
    const db = await Database.load("sqlite:iptv_data.db");
    onProgress?.('Organizing data...');

    const categories: Category[] = [];
    const categoryMap = new Map<string, Category>();

    // First pass: organize data in memory
    for (const media of playlist.medias) {
        const categoryName = media.attributes['group-title'] || 'Uncategorized';

        let category = categoryMap.get(categoryName);
        if (!category) {
            category = {
                name: categoryName,
                type: getTypeFromLocation(media.location),
                items: []
            };
            categories.push(category);
            categoryMap.set(categoryName, category);
        }

        category.items.push({
            name: media.attributes['tvg-name'] || 'Unknown',
            logo: media.attributes['tvg-logo'],
            url: media.location
        } as Item);
    }

    onProgress?.(`Processing ${categories.length} categories...`);

    try {
        // Start transaction
        await db.execute('BEGIN TRANSACTION');

        // Clear the database
        onProgress?.('Clearing existing data (items)...');
        await db.execute(`DELETE FROM items`);
        onProgress?.('Clearing existing data (categories)...');
        await db.execute(`DELETE FROM categories`);

        onProgress?.('Saving categories: 0%');

        // Insert categories one by one to get their IDs
        const categoryIds = new Map<string, number>();

        for (const category of categories) {
            const result = await db.execute(
                `INSERT INTO categories (name, type) VALUES (?, ?)`,
                [category.name, category.type]
            );
            categoryIds.set(category.name, result.lastInsertId as number);

            const progress = Math.round((categoryIds.size / categories.length) * 100);
            onProgress?.(`Saving categories: ${progress}%`);
        }

        // Prepare batch inserts for items
        const BATCH_SIZE = 500;
        let totalItemsProcessed = 0;
        const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

        // Process items in batches
        for (const category of categories) {
            const categoryId = categoryIds.get(category.name);
            const items = category.items;

            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const batch = items.slice(i, i + BATCH_SIZE);
                const values = batch.map(item =>
                    `('${item.name.replace(/'/g, "''")}', '${(item.logo || '').replace(/'/g, "''")}', '${item.url.replace(/'/g, "''")}', ${categoryId})`
                ).join(',');

                if (values.length > 0) {
                    await db.execute(
                        `INSERT INTO items (name, logo, url, category_id) VALUES ${values}`
                    );
                }

                totalItemsProcessed += batch.length;
                const progress = Math.round((totalItemsProcessed / totalItems) * 100);
                onProgress?.(`Saving items: ${progress}% (${totalItemsProcessed}/${totalItems})`);
            }
        }

        // Commit transaction
        await db.execute('COMMIT');
        onProgress?.('Database save completed successfully');

    } catch (error) {
        // Rollback on error
        await db.execute('ROLLBACK');
        console.error('Error saving data:', error);
        throw error;
    }
}

function getTypeFromLocation(location: string): Category["type"] {

    if (location.includes('/live/')) {
        return 'live';
    } else if (location.includes('/series/')) {
        return 'series';
    } else if (location.includes('/movie/')) {
        return 'movie';
    }
    return 'unknown';

}


export async function getCategoriesByType(type: Category["type"]): Promise<Category[]> {
    const db = await Database.load("sqlite:iptv_data.db");
    const result = await db.select('SELECT * FROM categories WHERE type = ?', [type]);
    return result as Category[];
}

export async function getCategoryWithItems(categoryId: string): Promise<Category> {

    const db = await Database.load("sqlite:iptv_data.db");

    const categegoriesResult: Category[] = await db.select('SELECT * FROM categories WHERE id = ?', [categoryId]);

    if (categegoriesResult.length === 0) {
        throw new Error('Category not found');
    }

    const category = categegoriesResult[0];

    category.items = await db.select('SELECT * FROM items WHERE category_id = ?', [categoryId]);

    return category;

}
