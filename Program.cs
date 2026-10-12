using PRBeats.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();
builder.Services.AddHttpClient();
builder.Services.AddScoped(sp => sp.GetRequiredService<IHttpClientFactory>().CreateClient());

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

app.MapStaticAssets();

// Pretty URLs for static admin pages (serve the .html without showing it in the address bar).
app.MapGet("/admin", async (IWebHostEnvironment env) =>
{
    var path = Path.Combine(env.WebRootPath, "admin.html");
    return Results.File(path, "text/html; charset=utf-8");
});
app.MapGet("/login", async (IWebHostEnvironment env) =>
{
    var path = Path.Combine(env.WebRootPath, "login.html");
    return Results.File(path, "text/html; charset=utf-8");
});

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
